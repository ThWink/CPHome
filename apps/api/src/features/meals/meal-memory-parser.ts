import type {
  MealMemoryParseResult,
  PersonTarget,
  PreferenceInput
} from "@couple-life/shared";

interface MealMemoryInput {
  text?: unknown;
  occurredOn?: unknown;
  person?: unknown;
}

const personTargets: PersonTarget[] = ["self", "partner", "both"];
const maxSharedTextLength = 80;

function todayIsoDate(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

function limitSharedText(value: string): string {
  return value.length <= maxSharedTextLength
    ? value
    : value.slice(0, maxSharedTextLength);
}

function normalizeText(input: MealMemoryInput): string {
  if (typeof input.text !== "string") {
    throw new Error("text is required");
  }

  const text = input.text.trim();
  if (text.length === 0) {
    throw new Error("text is required");
  }

  return text;
}

function normalizeDate(input: MealMemoryInput): string {
  if (input.occurredOn === undefined) {
    return todayIsoDate();
  }

  if (typeof input.occurredOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) {
    throw new Error("occurredOn must use YYYY-MM-DD");
  }

  return input.occurredOn;
}

function normalizePerson(input: MealMemoryInput): PersonTarget {
  if (input.person === undefined) {
    return "both";
  }

  if (typeof input.person !== "string" || !personTargets.includes(input.person as PersonTarget)) {
    throw new Error("person is invalid");
  }

  return input.person as PersonTarget;
}

function extractAmountCents(text: string): number | null {
  const directMatch = text.match(/(?:花了|花费|用了|价格|￥|¥)\s*(\d+(?:\.\d+)?)/);
  const yuanMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:元|块)/);
  const rawAmount = directMatch?.[1] ?? yuanMatch?.[1];

  if (!rawAmount) {
    return null;
  }

  return Math.round(Number(rawAmount) * 100);
}

function splitClauses(text: string): string[] {
  return text
    .split(/[，,。.!！?？]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function stripAmount(text: string): string {
  return text
    .replace(/(?:花了|花费|用了|价格|￥|¥)\s*\d+(?:\.\d+)?\s*(?:元|块)?/g, "")
    .replace(/\d+(?:\.\d+)?\s*(?:元|块)/g, "")
    .trim();
}

function extractDish(text: string): string {
  const match = text.match(/(?:吃了|点了|晚饭是|中午吃了|晚上吃了|今天吃了)([^，,。.!！?？]+)/);
  const rawDish = stripAmount(match?.[1] ?? text)
    .replace(/^(今天|中午|晚上|晚饭|午饭|早饭)/, "")
    .trim();

  return rawDish.length > 0 ? limitSharedText(rawDish) : "外卖";
}

function extractNote(text: string): string | null {
  const note = splitClauses(text)
    .filter((part) => !/(吃了|点了|晚饭是|中午吃了|晚上吃了|今天吃了)/.test(part))
    .filter((part) => stripAmount(part).length > 0)
    .map(stripAmount)
    .join("，")
    .trim();

  return note.length > 0 ? limitSharedText(note) : null;
}

function inferRating(text: string): number | null {
  if (/踩雷|难吃|不好吃|别再点/.test(text)) {
    return 1;
  }

  if (/有点腻|太油|下次少推荐|吃腻/.test(text)) {
    return 2;
  }

  if (/不错|好吃|喜欢|满意/.test(text)) {
    return 4;
  }

  return null;
}

function buildPreferenceUpdates(
  text: string,
  dish: string,
  person: PersonTarget,
  note: string | null
): PreferenceInput[] {
  const updates: PreferenceInput[] = [];

  if (/不要太辣|别太辣|不能太辣/.test(text)) {
    updates.push({
      person,
      category: "taste",
      value: "不要太辣",
      sentiment: "avoid",
      weight: -30,
      note: "微辣可以，避免太辣"
    });
  }

  if (/不错|好吃|喜欢|满意/.test(text)) {
    updates.push({
      person,
      category: "dish",
      value: dish,
      sentiment: "like",
      weight: 30,
      note: limitSharedText(`来自饮食记录：${note ?? "正向评价"}`)
    });
  }

  if (/有点腻|太油|下次少推荐|吃腻/.test(text)) {
    updates.push({
      person,
      category: "dish",
      value: dish,
      sentiment: "dislike",
      weight: -25,
      note: note ?? "用户希望降低推荐频率"
    });
  }

  return updates;
}

function formatAmount(amountCents: number | null): string {
  if (amountCents === null) {
    return "金额未记录";
  }

  const yuan = amountCents / 100;
  const amount = Number.isInteger(yuan)
    ? `${yuan}`
    : yuan.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

  return `花费${amount}元`;
}

function normalizeInput(input: unknown): MealMemoryInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("memory input must be an object");
  }

  return input as MealMemoryInput;
}

export function parseMealMemoryText(input: unknown): MealMemoryParseResult {
  const parsedInput = normalizeInput(input);
  const text = normalizeText(parsedInput);
  const occurredOn = normalizeDate(parsedInput);
  const person = normalizePerson(parsedInput);
  const dish = extractDish(text);
  const amountCents = extractAmountCents(text);
  const note = extractNote(text);

  return {
    confirmationRequired: true,
    mealRecord: {
      occurredOn,
      mealKind: "takeout",
      person,
      vendorName: dish,
      items: [dish],
      amountCents,
      rating: inferRating(text),
      note
    },
    preferenceUpdates: buildPreferenceUpdates(text, dish, person, note),
    memoryText: `${occurredOn} 吃了${dish}，${formatAmount(amountCents)}，评价：${note ?? "没有补充评价"}。`
  };
}
