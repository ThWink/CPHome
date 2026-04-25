import {
  parseRecommendationRequest,
  type MealRecommendation,
  type MealRecommendationsResponse,
  type RecommendationRequest
} from "@couple-life/shared";
import type { AppDatabase } from "../../db/client.js";
import { listRecentMealRecords, listTastePreferences } from "./meal-repository.js";

interface Candidate {
  title: string;
  vendorName: string;
  cuisine: string;
  tags: string[];
  estimatedMinutes: number;
  baseWeight: number;
  budget: "save" | "normal" | "treat";
}

interface ScoredCandidate extends Candidate {
  score: number;
}

const candidates: Candidate[] = [
  {
    title: "麻辣烫",
    vendorName: "常点麻辣烫",
    cuisine: "川味",
    tags: ["热汤", "可微辣", "蔬菜"],
    estimatedMinutes: 28,
    baseWeight: 55,
    budget: "normal"
  },
  {
    title: "粥和小菜",
    vendorName: "粥铺",
    cuisine: "清淡",
    tags: ["热汤", "清淡", "省事"],
    estimatedMinutes: 22,
    baseWeight: 45,
    budget: "save"
  },
  {
    title: "日式便当",
    vendorName: "便当店",
    cuisine: "日料",
    tags: ["稳定", "不辣", "快"],
    estimatedMinutes: 25,
    baseWeight: 48,
    budget: "normal"
  },
  {
    title: "炸鸡汉堡",
    vendorName: "炸鸡店",
    cuisine: "快餐",
    tags: ["快乐", "油炸", "快"],
    estimatedMinutes: 20,
    baseWeight: 38,
    budget: "normal"
  },
  {
    title: "黄焖鸡",
    vendorName: "黄焖鸡米饭",
    cuisine: "米饭",
    tags: ["热饭", "下饭"],
    estimatedMinutes: 26,
    baseWeight: 42,
    budget: "normal"
  },
  {
    title: "寿司拼盘",
    vendorName: "寿司店",
    cuisine: "日料",
    tags: ["清爽", "冷食"],
    estimatedMinutes: 35,
    baseWeight: 36,
    budget: "treat"
  }
];

function matchesCandidate(candidate: Candidate, value: string): boolean {
  return (
    candidate.title.includes(value) ||
    value.includes(candidate.title) ||
    candidate.vendorName.includes(value) ||
    value.includes(candidate.vendorName) ||
    candidate.cuisine.includes(value) ||
    candidate.tags.some((tag) => tag.includes(value) || value.includes(tag))
  );
}

function weatherScore(candidate: Candidate, request: RecommendationRequest): number {
  if (request.weather === "cold" && candidate.tags.includes("热汤")) {
    return 15;
  }

  if (request.weather === "hot" && candidate.tags.includes("清爽")) {
    return 15;
  }

  if (request.weather === "rainy" && candidate.tags.includes("热汤")) {
    return 10;
  }

  return 0;
}

function budgetScore(candidate: Candidate, request: RecommendationRequest): number {
  if (request.budget === candidate.budget) {
    return 12;
  }

  if (request.budget === "save" && candidate.budget === "treat") {
    return -25;
  }

  return 0;
}

function todayIsoDateInShanghai(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

function isoDateToDayNumber(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Math.floor(Date.UTC(year!, month! - 1, day!) / 86_400_000);
}

function isWithinRecentDays(occurredOn: string, maxRecentDays: number): boolean {
  const today = isoDateToDayNumber(todayIsoDateInShanghai());
  const occurred = isoDateToDayNumber(occurredOn);

  return occurred >= today - maxRecentDays;
}

function scoreCandidates(database: AppDatabase, request: RecommendationRequest): ScoredCandidate[] {
  const recentMeals = listRecentMealRecords(database, 50)
    .filter((meal) => isWithinRecentDays(meal.occurredOn, request.maxRecentDays));
  const preferences = listTastePreferences(database);

  return candidates
    .map((candidate) => {
      let score = candidate.baseWeight + weatherScore(candidate, request) + budgetScore(candidate, request);

      for (const preference of preferences) {
        if (matchesCandidate(candidate, preference.value)) {
          score += preference.sentiment === "like"
            ? Math.abs(preference.weight)
            : -Math.abs(preference.weight);
        }
      }

      for (const meal of recentMeals) {
        const matchedMeal =
          matchesCandidate(candidate, meal.vendorName) ||
          meal.items.some((item) => matchesCandidate(candidate, item));

        if (matchedMeal) {
          score -= 35;
        }
      }

      return {
        ...candidate,
        score
      };
    })
    .sort((a, b) => b.score - a.score);
}

function toRecommendation(
  slot: MealRecommendation["slot"],
  candidate: ScoredCandidate,
  reason: string
): MealRecommendation {
  return {
    slot,
    title: candidate.title,
    vendorName: candidate.vendorName,
    reason,
    estimatedMinutes: candidate.estimatedMinutes,
    weight: Math.max(1, Math.round(candidate.score))
  };
}

export function recommendMeals(database: AppDatabase, input: unknown): MealRecommendationsResponse {
  const request = parseRecommendationRequest(input);
  const scored = scoreCandidates(database, request);

  if (scored.length === 0) {
    throw new Error("no meal candidates configured");
  }

  const fastest = [...scored].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes)[0]!;
  const favorite = scored[0]!;
  const today =
    scored.find((candidate) => candidate.title !== fastest.title && candidate.title !== favorite.title) ??
    scored.find((candidate) => candidate.title !== favorite.title) ??
    favorite;

  return {
    recommendations: [
      toRecommendation("fastest", fastest, "配送时间最短，适合快速决定。"),
      toRecommendation("favorite", favorite, "结合历史偏好后权重最高。"),
      toRecommendation("today", today, "综合天气、预算和最近吃过的记录。")
    ],
    rouletteCandidates: scored
      .slice(0, 5)
      .map((candidate) => toRecommendation("today", candidate, "转盘候选，权重越高越容易抽中。"))
  };
}
