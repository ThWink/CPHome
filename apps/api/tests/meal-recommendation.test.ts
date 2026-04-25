import { describe, expect, it } from "vitest";
import { openDatabase } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrations.js";
import { createMealRecord, upsertTastePreference } from "../src/features/meals/meal-repository.js";
import { recommendMeals } from "../src/features/meals/meal-recommendation-service.js";

describe("recommendMeals", () => {
  it("returns three recommendations and weighted roulette candidates", () => {
    const database = openDatabase(":memory:");

    try {
      runMigrations(database.sqlite);

      upsertTastePreference(database, {
        person: "partner",
        category: "dish",
        value: "麻辣烫",
        sentiment: "like",
        weight: 40,
        note: "她经常想吃"
      });

      createMealRecord(database, {
        occurredOn: "2026-04-25",
        mealKind: "takeout",
        person: "both",
        vendorName: "黄焖鸡米饭",
        items: ["黄焖鸡"],
        amountCents: 4200,
        rating: 2,
        note: "有点腻"
      });

      const result = recommendMeals(database, {
        weather: "cold",
        budget: "normal",
        maxRecentDays: 3
      });

      expect(result.recommendations).toHaveLength(3);
      expect(result.recommendations.map((item) => item.slot)).toEqual(["fastest", "favorite", "today"]);
      expect(result.recommendations.find((item) => item.slot === "favorite")?.title).toBe("麻辣烫");
      expect(result.rouletteCandidates.length).toBeGreaterThanOrEqual(3);
      expect(result.rouletteCandidates.every((item) => item.weight > 0)).toBe(true);
    } finally {
      database.sqlite.close();
    }
  });

  it("does not penalize meals outside the recent day window", () => {
    const database = openDatabase(":memory:");

    try {
      runMigrations(database.sqlite);

      createMealRecord(database, {
        occurredOn: "2000-01-01",
        mealKind: "takeout",
        person: "both",
        vendorName: "常点麻辣烫",
        items: ["麻辣烫"],
        amountCents: 4500,
        rating: 4,
        note: "很久以前吃过"
      });

      const result = recommendMeals(database, {
        weather: "cold",
        budget: "normal",
        maxRecentDays: 3
      });

      expect(result.recommendations.find((item) => item.slot === "favorite")?.title).toBe("麻辣烫");
    } finally {
      database.sqlite.close();
    }
  });
});
