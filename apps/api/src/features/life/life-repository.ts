import {
  parseExpenseInput,
  parseParcelInput,
  parseParcelStatusInput,
  parseWaterDrinkInput,
  type DashboardToday,
  type Expense,
  type Parcel,
  type ParcelStatus,
  type WaterDrink,
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

export function normalizeLocalDate(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return new Date().toISOString().slice(0, 10);
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("date must use YYYY-MM-DD");
  }

  return value;
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

export function getDashboardToday(database: AppDatabase, date: string): DashboardToday {
  return {
    date,
    water: getWaterTodaySummary(database, date),
    pendingParcels: listPendingParcels(database),
    recentExpense: listRecentExpenses(database, 1)[0] ?? null
  };
}
