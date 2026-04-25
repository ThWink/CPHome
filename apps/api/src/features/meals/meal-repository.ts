import {
  parseMealRecordInput,
  parsePreferenceInput,
  type MealRecord,
  type TastePreference
} from "@couple-life/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../../db/client.js";

interface MealRecordRow {
  id: string;
  occurred_on: string;
  meal_kind: MealRecord["mealKind"];
  person: MealRecord["person"];
  vendor_name: string;
  items_json: string;
  amount_cents: number | null;
  rating: number | null;
  note: string | null;
  created_at: string;
}

interface TastePreferenceRow {
  id: string;
  person: TastePreference["person"];
  category: TastePreference["category"];
  value: string;
  sentiment: TastePreference["sentiment"];
  weight: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

function mapMealRecord(row: MealRecordRow): MealRecord {
  return {
    id: row.id,
    occurredOn: row.occurred_on,
    mealKind: row.meal_kind,
    person: row.person,
    vendorName: row.vendor_name,
    items: JSON.parse(row.items_json) as string[],
    amountCents: row.amount_cents,
    rating: row.rating,
    note: row.note,
    createdAt: row.created_at
  };
}

function mapTastePreference(row: TastePreferenceRow): TastePreference {
  return {
    id: row.id,
    person: row.person,
    category: row.category,
    value: row.value,
    sentiment: row.sentiment,
    weight: row.weight,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createMealRecord(database: AppDatabase, input: unknown): MealRecord {
  const parsed = parseMealRecordInput(input);
  const id = nanoid();

  database.sqlite
    .prepare(`
      insert into meal_records (
        id,
        occurred_on,
        meal_kind,
        person,
        vendor_name,
        items_json,
        amount_cents,
        rating,
        note
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      parsed.occurredOn,
      parsed.mealKind,
      parsed.person,
      parsed.vendorName,
      JSON.stringify(parsed.items),
      parsed.amountCents,
      parsed.rating,
      parsed.note
    );

  const row = database.sqlite
    .prepare("select * from meal_records where id = ?")
    .get(id) as MealRecordRow;

  return mapMealRecord(row);
}

export function listRecentMealRecords(database: AppDatabase, limit: number): MealRecord[] {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const rows = database.sqlite
    .prepare("select * from meal_records order by occurred_on desc, created_at desc limit ?")
    .all(safeLimit) as MealRecordRow[];

  return rows.map(mapMealRecord);
}

export function upsertTastePreference(database: AppDatabase, input: unknown): TastePreference {
  const parsed = parsePreferenceInput(input);
  const existing = database.sqlite
    .prepare(`
      select id from taste_preferences
      where person = ? and category = ? and value = ?
    `)
    .get(parsed.person, parsed.category, parsed.value) as { id: string } | undefined;

  const id = existing?.id ?? nanoid();

  if (existing) {
    database.sqlite
      .prepare(`
        update taste_preferences
        set sentiment = ?, weight = ?, note = ?, updated_at = CURRENT_TIMESTAMP
        where id = ?
      `)
      .run(parsed.sentiment, parsed.weight, parsed.note, id);
  } else {
    database.sqlite
      .prepare(`
        insert into taste_preferences (
          id,
          person,
          category,
          value,
          sentiment,
          weight,
          note
        ) values (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(id, parsed.person, parsed.category, parsed.value, parsed.sentiment, parsed.weight, parsed.note);
  }

  const row = database.sqlite
    .prepare("select * from taste_preferences where id = ?")
    .get(id) as TastePreferenceRow;

  return mapTastePreference(row);
}

export function listTastePreferences(database: AppDatabase): TastePreference[] {
  const rows = database.sqlite
    .prepare("select * from taste_preferences order by updated_at desc, created_at desc")
    .all() as TastePreferenceRow[];

  return rows.map(mapTastePreference);
}

export function createMealMemory(database: AppDatabase, mealRecordId: string, content: string): string {
  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    throw new Error("memory content is required");
  }

  const id = nanoid();
  const embeddingId = nanoid();

  database.sqlite.exec("begin");

  try {
    database.sqlite
      .prepare("insert into meal_memory_entries (id, meal_record_id, content) values (?, ?, ?)")
      .run(id, mealRecordId, trimmedContent);

    database.sqlite
      .prepare(`
        insert into memory_embeddings (
          id,
          memory_type,
          source_table,
          source_id,
          content,
          embedding_json,
          metadata_json
        ) values (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        embeddingId,
        "meal",
        "meal_records",
        mealRecordId,
        trimmedContent,
        "[]",
        JSON.stringify({ mealRecordId })
      );

    database.sqlite.exec("commit");
  } catch (error) {
    database.sqlite.exec("rollback");
    throw error;
  }

  return id;
}
