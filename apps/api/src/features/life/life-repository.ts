import {
  parseAnniversaryInput,
  parseExpenseInput,
  parseParcelInput,
  parseParcelStatusInput,
  parseTodoInput,
  parseTodoStatusInput,
  parseWaterDrinkInput,
  parseWaterReminderInput,
  parseWaterReminderStatusInput,
  type Anniversary,
  type DashboardToday,
  type Expense,
  type ExpenseMonthlySummary,
  type Parcel,
  type ParcelStatus,
  type Todo,
  type UpcomingAnniversary,
  type WaterDrink,
  type WaterReminder,
  type WaterReminderStatus,
  type WeatherToday,
  type WaterTodaySummary
} from "@couple-life/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../../db/client.js";

interface ExpenseRow {
  id: string;
  occurred_on: string;
  category: Expense["category"];
  payer: Expense["payer"];
  amount_cents: number;
  note: string | null;
  created_at: string;
}

interface ExpenseCategorySummaryRow {
  category: Expense["category"];
  amount_cents: number;
  count: number;
}

interface ExpensePayerSummaryRow {
  payer: Expense["payer"];
  amount_cents: number;
  count: number;
}

interface ParcelRow {
  id: string;
  title: string;
  pickup_code: string;
  location: string;
  owner: Parcel["owner"];
  status: ParcelStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface WaterDrinkRow {
  id: string;
  person: WaterDrink["person"];
  occurred_on: string;
  amount_ml: number;
  created_at: string;
}

interface WaterReminderRow {
  id: string;
  from_person: WaterReminder["fromPerson"];
  target_person: WaterReminder["targetPerson"];
  remind_on: string;
  message: string | null;
  status: WaterReminderStatus;
  created_at: string;
  updated_at: string;
}

interface TodoRow {
  id: string;
  title: string;
  assignee: Todo["assignee"];
  due_on: string | null;
  status: Todo["status"];
  created_at: string;
  updated_at: string;
}

interface AnniversaryRow {
  id: string;
  title: string;
  date: string;
  repeat: Anniversary["repeat"];
  remind_days_before: number;
  created_at: string;
  updated_at: string;
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    occurredOn: row.occurred_on,
    category: row.category,
    payer: row.payer,
    amountCents: row.amount_cents,
    note: row.note,
    createdAt: row.created_at
  };
}

function mapParcel(row: ParcelRow): Parcel {
  return {
    id: row.id,
    title: row.title,
    pickupCode: row.pickup_code,
    location: row.location,
    owner: row.owner,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapWaterDrink(row: WaterDrinkRow): WaterDrink {
  return {
    id: row.id,
    person: row.person,
    occurredOn: row.occurred_on,
    amountMl: row.amount_ml,
    createdAt: row.created_at
  };
}

function mapWaterReminder(row: WaterReminderRow): WaterReminder {
  return {
    id: row.id,
    fromPerson: row.from_person,
    targetPerson: row.target_person,
    remindOn: row.remind_on,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    assignee: row.assignee,
    dueOn: row.due_on,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAnniversary(row: AnniversaryRow): Anniversary {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    repeat: row.repeat,
    remindDaysBefore: row.remind_days_before,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function normalizeLocalDate(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return new Date().toISOString().slice(0, 10);
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("date must use YYYY-MM-DD");
  }

  return value;
}

export function normalizeLocalMonth(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return new Date().toISOString().slice(0, 7);
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) {
    throw new Error("month must use YYYY-MM");
  }

  const monthNumber = Number(value.slice(5, 7));
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error("month must use YYYY-MM");
  }

  return value;
}

function parseDateUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getNextMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function daysBetween(start: string, end: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseDateUtc(end).getTime() - parseDateUtc(start).getTime()) / msPerDay);
}

function getNextAnniversaryDate(anniversary: Anniversary, fromDate: string): string | null {
  if (anniversary.repeat === "none") {
    return anniversary.date >= fromDate ? anniversary.date : null;
  }

  const from = parseDateUtc(fromDate);
  const [, month, day] = anniversary.date.split("-");
  let next = parseDateUtc(`${from.getUTCFullYear()}-${month}-${day}`);

  if (formatDateUtc(next) < fromDate) {
    next = parseDateUtc(`${from.getUTCFullYear() + 1}-${month}-${day}`);
  }

  return formatDateUtc(next);
}

export function getWeatherToday(cityInput: unknown): WeatherToday {
  const city = typeof cityInput === "string" && cityInput.trim().length > 0
    ? cityInput.trim().slice(0, 20)
    : "本地";

  return {
    city,
    condition: "多云",
    temperatureC: 24,
    advice: "适合点一份热乎但不油腻的外卖，出门取快递记得带伞。",
    updatedAt: new Date().toISOString(),
    source: "local"
  };
}

export function createWaterDrink(database: AppDatabase, input: unknown): WaterDrink {
  const parsed = parseWaterDrinkInput(input);
  const id = nanoid();

  database.sqlite
    .prepare(`
      insert into water_drinks (
        id,
        person,
        occurred_on,
        amount_ml
      ) values (?, ?, ?, ?)
    `)
    .run(id, parsed.person, parsed.occurredOn, parsed.amountMl);

  const row = database.sqlite
    .prepare("select * from water_drinks where id = ?")
    .get(id) as WaterDrinkRow;

  return mapWaterDrink(row);
}

export function getWaterTodaySummary(database: AppDatabase, occurredOn: string): WaterTodaySummary {
  const rows = database.sqlite
    .prepare(`
      select person, count(*) as drink_count, coalesce(sum(amount_ml), 0) as total_ml
      from water_drinks
      where occurred_on = ? and person in ('self', 'partner')
      group by person
    `)
    .all(occurredOn) as Array<{
      person: "self" | "partner";
      drink_count: number;
      total_ml: number;
    }>;

  const byPerson = new Map(rows.map((row) => [row.person, row]));

  return {
    occurredOn,
    people: (["self", "partner"] as const).map((person) => {
      const row = byPerson.get(person);
      return {
        person,
        drinkCount: row?.drink_count ?? 0,
        totalMl: row?.total_ml ?? 0
      };
    })
  };
}

export function createWaterReminder(database: AppDatabase, input: unknown): WaterReminder {
  const parsed = parseWaterReminderInput(input);
  const id = nanoid();

  database.sqlite
    .prepare(`
      insert into water_reminders (
        id,
        from_person,
        target_person,
        remind_on,
        message
      ) values (?, ?, ?, ?, ?)
    `)
    .run(id, parsed.fromPerson, parsed.targetPerson, parsed.remindOn, parsed.message);

  const row = database.sqlite
    .prepare("select * from water_reminders where id = ?")
    .get(id) as WaterReminderRow;

  return mapWaterReminder(row);
}

export function listPendingWaterReminders(database: AppDatabase, remindOn: string): WaterReminder[] {
  const rows = database.sqlite
    .prepare(`
      select * from water_reminders
      where status = 'pending' and remind_on <= ?
      order by remind_on asc, created_at desc
    `)
    .all(remindOn) as WaterReminderRow[];

  return rows.map(mapWaterReminder);
}

export function updateWaterReminderStatus(database: AppDatabase, id: string, input: unknown): WaterReminder {
  const parsed = parseWaterReminderStatusInput(input);

  database.sqlite
    .prepare("update water_reminders set status = ?, updated_at = CURRENT_TIMESTAMP where id = ?")
    .run(parsed.status, id);

  const row = database.sqlite
    .prepare("select * from water_reminders where id = ?")
    .get(id) as WaterReminderRow | undefined;

  if (!row) {
    throw new Error("water reminder not found");
  }

  return mapWaterReminder(row);
}

export function createParcel(database: AppDatabase, input: unknown): Parcel {
  const parsed = parseParcelInput(input);
  const id = nanoid();

  database.sqlite
    .prepare(`
      insert into parcels (
        id,
        title,
        pickup_code,
        location,
        owner,
        note
      ) values (?, ?, ?, ?, ?, ?)
    `)
    .run(id, parsed.title, parsed.pickupCode, parsed.location, parsed.owner, parsed.note);

  const row = database.sqlite
    .prepare("select * from parcels where id = ?")
    .get(id) as ParcelRow;

  return mapParcel(row);
}

export function listPendingParcels(database: AppDatabase): Parcel[] {
  const rows = database.sqlite
    .prepare("select * from parcels where status = 'pending' order by created_at desc")
    .all() as ParcelRow[];

  return rows.map(mapParcel);
}

export function updateParcelStatus(database: AppDatabase, id: string, input: unknown): Parcel {
  const parsed = parseParcelStatusInput(input);

  database.sqlite
    .prepare("update parcels set status = ?, updated_at = CURRENT_TIMESTAMP where id = ?")
    .run(parsed.status, id);

  const row = database.sqlite
    .prepare("select * from parcels where id = ?")
    .get(id) as ParcelRow | undefined;

  if (!row) {
    throw new Error("parcel not found");
  }

  return mapParcel(row);
}

export function createExpense(database: AppDatabase, input: unknown): Expense {
  const parsed = parseExpenseInput(input);
  const id = nanoid();

  database.sqlite
    .prepare(`
      insert into expenses (
        id,
        occurred_on,
        category,
        payer,
        amount_cents,
        note
      ) values (?, ?, ?, ?, ?, ?)
    `)
    .run(id, parsed.occurredOn, parsed.category, parsed.payer, parsed.amountCents, parsed.note);

  const row = database.sqlite
    .prepare("select * from expenses where id = ?")
    .get(id) as ExpenseRow;

  return mapExpense(row);
}

export function listRecentExpenses(database: AppDatabase, limit: number): Expense[] {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const rows = database.sqlite
    .prepare("select * from expenses order by occurred_on desc, created_at desc limit ?")
    .all(safeLimit) as ExpenseRow[];

  return rows.map(mapExpense);
}

export function getExpenseMonthlySummary(database: AppDatabase, monthInput: unknown): ExpenseMonthlySummary {
  const month = normalizeLocalMonth(monthInput);
  const fromDate = `${month}-01`;
  const toDate = `${getNextMonth(month)}-01`;
  const totalRow = database.sqlite
    .prepare(`
      select coalesce(sum(amount_cents), 0) as total_cents
      from expenses
      where occurred_on >= ? and occurred_on < ?
    `)
    .get(fromDate, toDate) as { total_cents: number } | undefined;

  const categoryRows = database.sqlite
    .prepare(`
      select category, sum(amount_cents) as amount_cents, count(*) as count
      from expenses
      where occurred_on >= ? and occurred_on < ?
      group by category
      order by amount_cents desc, category asc
    `)
    .all(fromDate, toDate) as ExpenseCategorySummaryRow[];

  const payerRows = database.sqlite
    .prepare(`
      select payer, sum(amount_cents) as amount_cents, count(*) as count
      from expenses
      where occurred_on >= ? and occurred_on < ?
      group by payer
      order by amount_cents desc, payer asc
    `)
    .all(fromDate, toDate) as ExpensePayerSummaryRow[];

  return {
    month,
    totalCents: totalRow?.total_cents ?? 0,
    byCategory: categoryRows.map((row) => ({
      category: row.category,
      amountCents: row.amount_cents,
      count: row.count
    })),
    byPayer: payerRows.map((row) => ({
      payer: row.payer,
      amountCents: row.amount_cents,
      count: row.count
    }))
  };
}

export function createTodo(database: AppDatabase, input: unknown): Todo {
  const parsed = parseTodoInput(input);
  const id = nanoid();

  database.sqlite
    .prepare(`
      insert into todos (
        id,
        title,
        assignee,
        due_on
      ) values (?, ?, ?, ?)
    `)
    .run(id, parsed.title, parsed.assignee, parsed.dueOn);

  const row = database.sqlite
    .prepare("select * from todos where id = ?")
    .get(id) as TodoRow;

  return mapTodo(row);
}

export function listOpenTodos(database: AppDatabase): Todo[] {
  const rows = database.sqlite
    .prepare(`
      select * from todos
      where status = 'open'
      order by due_on is null, due_on asc, created_at desc
    `)
    .all() as TodoRow[];

  return rows.map(mapTodo);
}

export function updateTodoStatus(database: AppDatabase, id: string, input: unknown): Todo {
  const parsed = parseTodoStatusInput(input);

  database.sqlite
    .prepare("update todos set status = ?, updated_at = CURRENT_TIMESTAMP where id = ?")
    .run(parsed.status, id);

  const row = database.sqlite
    .prepare("select * from todos where id = ?")
    .get(id) as TodoRow | undefined;

  if (!row) {
    throw new Error("todo not found");
  }

  return mapTodo(row);
}

export function createAnniversary(database: AppDatabase, input: unknown): Anniversary {
  const parsed = parseAnniversaryInput(input);
  const id = nanoid();

  database.sqlite
    .prepare(`
      insert into anniversaries (
        id,
        title,
        date,
        repeat,
        remind_days_before
      ) values (?, ?, ?, ?, ?)
    `)
    .run(id, parsed.title, parsed.date, parsed.repeat, parsed.remindDaysBefore);

  const row = database.sqlite
    .prepare("select * from anniversaries where id = ?")
    .get(id) as AnniversaryRow;

  return mapAnniversary(row);
}

export function listUpcomingAnniversaries(
  database: AppDatabase,
  fromDate: string,
  limit = 10
): UpcomingAnniversary[] {
  const rows = database.sqlite
    .prepare("select * from anniversaries order by date asc")
    .all() as AnniversaryRow[];

  return rows
    .map(mapAnniversary)
    .map((anniversary) => {
      const nextOn = getNextAnniversaryDate(anniversary, fromDate);
      if (nextOn === null) {
        return null;
      }

      return {
        ...anniversary,
        nextOn,
        daysLeft: daysBetween(fromDate, nextOn)
      };
    })
    .filter((anniversary): anniversary is UpcomingAnniversary => anniversary !== null)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, limit);
}

export function getDashboardToday(database: AppDatabase, date: string): DashboardToday {
  return {
    date,
    weather: getWeatherToday("本地"),
    water: getWaterTodaySummary(database, date),
    pendingWaterReminders: listPendingWaterReminders(database, date),
    pendingParcels: listPendingParcels(database),
    recentExpense: listRecentExpenses(database, 1)[0] ?? null,
    openTodos: listOpenTodos(database),
    upcomingAnniversaries: listUpcomingAnniversaries(database, date, 5)
  };
}
