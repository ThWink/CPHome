import type { PersonTarget } from "./meal.js";

export type ExpenseCategory =
  | "takeout"
  | "groceries"
  | "daily"
  | "rent"
  | "utilities"
  | "transport"
  | "entertainment"
  | "other";

export type ParcelStatus = "pending" | "picked" | "canceled";

export interface ExpenseInput {
  occurredOn: string;
  category: ExpenseCategory;
  payer: PersonTarget;
  amountCents: number;
  note: string | null;
}

export interface Expense extends ExpenseInput {
  id: string;
  createdAt: string;
}

export interface ParcelInput {
  title: string;
  pickupCode: string;
  location: string;
  owner: PersonTarget;
  note: string | null;
}

export interface Parcel extends ParcelInput {
  id: string;
  status: ParcelStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ParcelStatusInput {
  status: ParcelStatus;
}

export interface WaterDrinkInput {
  person: PersonTarget;
  occurredOn: string;
  amountMl: number;
}

export interface WaterDrink extends WaterDrinkInput {
  id: string;
  createdAt: string;
}

export interface WaterTodaySummary {
  occurredOn: string;
  people: Array<{
    person: PersonTarget;
    drinkCount: number;
    totalMl: number;
  }>;
}

export interface DashboardToday {
  date: string;
  water: WaterTodaySummary;
  pendingParcels: Parcel[];
  recentExpense: Expense | null;
}

const people: PersonTarget[] = ["self", "partner", "both"];
const expenseCategories: ExpenseCategory[] = [
  "takeout",
  "groceries",
  "daily",
  "rent",
  "utilities",
  "transport",
  "entertainment",
  "other"
];
const parcelStatuses: ParcelStatus[] = ["pending", "picked", "canceled"];

function normalizeRequiredText(value: unknown, fieldName: string, maxLength = 80): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer`);
  }

  return trimmed;
}

function normalizeNullableText(value: unknown, fieldName: string, maxLength = 120): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeRequiredText(value, fieldName, maxLength);
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fieldName: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value as T;
}

function normalizeDate(value: unknown, fieldName: string): string {
  const date = normalizeRequiredText(value, fieldName, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD`);
  }

  return date;
}

function normalizeNonNegativeInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  return value;
}

export function parseExpenseInput(input: unknown): ExpenseInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("expense input must be an object");
  }

  const record = input as Record<string, unknown>;

  return {
    occurredOn: normalizeDate(record.occurredOn, "occurredOn"),
    category: normalizeEnum(record.category, expenseCategories, "category"),
    payer: normalizeEnum(record.payer, people, "payer"),
    amountCents: normalizeNonNegativeInteger(record.amountCents, "amountCents"),
    note: normalizeNullableText(record.note, "note")
  };
}

export function parseParcelInput(input: unknown): ParcelInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("parcel input must be an object");
  }

  const record = input as Record<string, unknown>;

  return {
    title: normalizeRequiredText(record.title, "title"),
    pickupCode: normalizeRequiredText(record.pickupCode, "pickupCode", 40),
    location: normalizeRequiredText(record.location, "location"),
    owner: normalizeEnum(record.owner, people, "owner"),
    note: normalizeNullableText(record.note, "note")
  };
}

export function parseParcelStatusInput(input: unknown): ParcelStatusInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("parcel status input must be an object");
  }

  const record = input as Record<string, unknown>;

  return {
    status: normalizeEnum(record.status, parcelStatuses, "status")
  };
}

export function parseWaterDrinkInput(input: unknown): WaterDrinkInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("water drink input must be an object");
  }

  const record = input as Record<string, unknown>;
  const amountMl = record.amountMl === undefined ? 250 : record.amountMl;

  return {
    person: normalizeEnum(record.person, people, "person"),
    occurredOn: normalizeDate(record.occurredOn, "occurredOn"),
    amountMl: normalizeNonNegativeInteger(amountMl, "amountMl")
  };
}
