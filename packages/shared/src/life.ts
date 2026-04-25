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
export type TodoStatus = "open" | "done";
export type AnniversaryRepeat = "none" | "yearly";
export type CouplePerson = "self" | "partner";
export type WaterReminderStatus = "pending" | "done";

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

export interface ExpenseCategorySummary {
  category: ExpenseCategory;
  amountCents: number;
  count: number;
}

export interface ExpensePayerSummary {
  payer: PersonTarget;
  amountCents: number;
  count: number;
}

export interface ExpenseMonthlySummary {
  month: string;
  totalCents: number;
  byCategory: ExpenseCategorySummary[];
  byPayer: ExpensePayerSummary[];
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

export interface WaterReminderInput {
  fromPerson: CouplePerson;
  targetPerson: CouplePerson;
  remindOn: string;
  message: string | null;
}

export interface WaterReminder extends WaterReminderInput {
  id: string;
  status: WaterReminderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WaterReminderStatusInput {
  status: WaterReminderStatus;
}

export interface TodoInput {
  title: string;
  assignee: PersonTarget;
  dueOn: string | null;
}

export interface Todo extends TodoInput {
  id: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TodoStatusInput {
  status: TodoStatus;
}

export interface AnniversaryInput {
  title: string;
  date: string;
  repeat: AnniversaryRepeat;
  remindDaysBefore: number;
}

export interface Anniversary extends AnniversaryInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingAnniversary extends Anniversary {
  nextOn: string;
  daysLeft: number;
}

export interface WeatherToday {
  city: string;
  condition: string;
  temperatureC: number;
  advice: string;
  updatedAt: string;
  source?: "online" | "local";
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
  weather: WeatherToday;
  water: WaterTodaySummary;
  pendingWaterReminders: WaterReminder[];
  pendingParcels: Parcel[];
  recentExpense: Expense | null;
  openTodos: Todo[];
  upcomingAnniversaries: UpcomingAnniversary[];
}

const people: PersonTarget[] = ["self", "partner", "both"];
const couplePeople: CouplePerson[] = ["self", "partner"];
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
const todoStatuses: TodoStatus[] = ["open", "done"];
const waterReminderStatuses: WaterReminderStatus[] = ["pending", "done"];
const anniversaryRepeats: AnniversaryRepeat[] = ["none", "yearly"];

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

function normalizeNullableDate(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizeDate(value, fieldName);
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

export function parseWaterReminderInput(input: unknown): WaterReminderInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("water reminder input must be an object");
  }

  const record = input as Record<string, unknown>;

  return {
    fromPerson: normalizeEnum(record.fromPerson, couplePeople, "fromPerson"),
    targetPerson: normalizeEnum(record.targetPerson, couplePeople, "targetPerson"),
    remindOn: normalizeDate(record.remindOn, "remindOn"),
    message: normalizeNullableText(record.message, "message")
  };
}

export function parseWaterReminderStatusInput(input: unknown): WaterReminderStatusInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("water reminder status input must be an object");
  }

  const record = input as Record<string, unknown>;

  return {
    status: normalizeEnum(record.status, waterReminderStatuses, "status")
  };
}

export function parseTodoInput(input: unknown): TodoInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("todo input must be an object");
  }

  const record = input as Record<string, unknown>;

  return {
    title: normalizeRequiredText(record.title, "title"),
    assignee: normalizeEnum(record.assignee, people, "assignee"),
    dueOn: normalizeNullableDate(record.dueOn, "dueOn")
  };
}

export function parseTodoStatusInput(input: unknown): TodoStatusInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("todo status input must be an object");
  }

  const record = input as Record<string, unknown>;

  return {
    status: normalizeEnum(record.status, todoStatuses, "status")
  };
}

export function parseAnniversaryInput(input: unknown): AnniversaryInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("anniversary input must be an object");
  }

  const record = input as Record<string, unknown>;
  const remindDaysBefore = record.remindDaysBefore ?? 0;

  if (
    typeof remindDaysBefore !== "number" ||
    !Number.isInteger(remindDaysBefore) ||
    remindDaysBefore < 0 ||
    remindDaysBefore > 30
  ) {
    throw new Error("remindDaysBefore must be an integer from 0 to 30");
  }

  return {
    title: normalizeRequiredText(record.title, "title"),
    date: normalizeDate(record.date, "date"),
    repeat: normalizeEnum(record.repeat, anniversaryRepeats, "repeat"),
    remindDaysBefore
  };
}
