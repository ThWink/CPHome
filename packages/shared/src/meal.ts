export type PersonTarget = "self" | "partner" | "both";
export type MealKind = "takeout" | "home_cooked" | "dine_in";
export type PreferenceCategory = "dish" | "cuisine" | "taste" | "ingredient" | "vendor";
export type PreferenceSentiment = "like" | "dislike" | "avoid";
export type WeatherMood = "normal" | "cold" | "hot" | "rainy";
export type BudgetMood = "save" | "normal" | "treat";
export type RecommendationSlot = "fastest" | "favorite" | "today";

export interface MealRecordInput {
  occurredOn: string;
  mealKind: MealKind;
  person: PersonTarget;
  vendorName: string;
  items: string[];
  amountCents: number | null;
  rating: number | null;
  note: string | null;
}

export interface MealRecord extends MealRecordInput {
  id: string;
  createdAt: string;
}

export interface PreferenceInput {
  person: PersonTarget;
  category: PreferenceCategory;
  value: string;
  sentiment: PreferenceSentiment;
  weight: number;
  note: string | null;
}

export interface TastePreference extends PreferenceInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealMemoryParseRequest {
  text: string;
  occurredOn?: string;
  person?: PersonTarget;
}

export interface MealMemoryParseResult {
  confirmationRequired: true;
  mealRecord: MealRecordInput;
  preferenceUpdates: PreferenceInput[];
  memoryText: string;
}

export interface RecommendationRequest {
  weather: WeatherMood;
  budget: BudgetMood;
  maxRecentDays: number;
}

export interface MealRecommendation {
  slot: RecommendationSlot;
  title: string;
  vendorName: string;
  reason: string;
  estimatedMinutes: number;
  weight: number;
}

export interface MealRecommendationsResponse {
  recommendations: MealRecommendation[];
  rouletteCandidates: MealRecommendation[];
}

const mealKinds: MealKind[] = ["takeout", "home_cooked", "dine_in"];
const personTargets: PersonTarget[] = ["self", "partner", "both"];
const preferenceCategories: PreferenceCategory[] = ["dish", "cuisine", "taste", "ingredient", "vendor"];
const preferenceSentiments: PreferenceSentiment[] = ["like", "dislike", "avoid"];
const weatherMoods: WeatherMood[] = ["normal", "cold", "hot", "rainy"];
const budgetMoods: BudgetMood[] = ["save", "normal", "treat"];

function normalizeRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  if (trimmed.length > 80) {
    throw new Error(`${fieldName} must be 80 characters or fewer`);
  }

  return trimmed;
}

function normalizeNullableText(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeRequiredText(value, fieldName);
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fieldName: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value as T;
}

function normalizeDate(value: unknown): string {
  const date = normalizeRequiredText(value, "occurredOn");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("occurredOn must use YYYY-MM-DD");
  }

  return date;
}

function normalizeAmount(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error("amountCents must be a non-negative integer");
  }

  return value;
}

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("rating must be an integer from 1 to 5");
  }

  return value;
}

function normalizeItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("items must be an array");
  }

  const items = value.map((item) => normalizeRequiredText(item, "items"));

  if (items.length === 0) {
    throw new Error("items must contain at least one item");
  }

  return items;
}

export function parseMealRecordInput(input: unknown): MealRecordInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("meal record input must be an object");
  }

  const record = input as Record<string, unknown>;

  return {
    occurredOn: normalizeDate(record.occurredOn),
    mealKind: normalizeEnum(record.mealKind, mealKinds, "mealKind"),
    person: normalizeEnum(record.person, personTargets, "person"),
    vendorName: normalizeRequiredText(record.vendorName, "vendorName"),
    items: normalizeItems(record.items),
    amountCents: normalizeAmount(record.amountCents),
    rating: normalizeRating(record.rating),
    note: normalizeNullableText(record.note, "note")
  };
}

export function parsePreferenceInput(input: unknown): PreferenceInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("preference input must be an object");
  }

  const record = input as Record<string, unknown>;
  const weight = record.weight;

  if (typeof weight !== "number" || !Number.isInteger(weight) || weight < -100 || weight > 100) {
    throw new Error("weight must be an integer from -100 to 100");
  }

  return {
    person: normalizeEnum(record.person, personTargets, "person"),
    category: normalizeEnum(record.category, preferenceCategories, "category"),
    value: normalizeRequiredText(record.value, "value"),
    sentiment: normalizeEnum(record.sentiment, preferenceSentiments, "sentiment"),
    weight,
    note: normalizeNullableText(record.note, "note")
  };
}

export function parseRecommendationRequest(input: unknown): RecommendationRequest {
  if (typeof input !== "object" || input === null) {
    throw new Error("recommendation request must be an object");
  }

  const record = input as Record<string, unknown>;
  const maxRecentDays = record.maxRecentDays ?? 3;

  if (typeof maxRecentDays !== "number" || !Number.isInteger(maxRecentDays) || maxRecentDays < 1 || maxRecentDays > 30) {
    throw new Error("maxRecentDays must be an integer from 1 to 30");
  }

  return {
    weather: record.weather === undefined ? "normal" : normalizeEnum(record.weather, weatherMoods, "weather"),
    budget: record.budget === undefined ? "normal" : normalizeEnum(record.budget, budgetMoods, "budget"),
    maxRecentDays
  };
}
