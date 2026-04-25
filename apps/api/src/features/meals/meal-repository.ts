import {
  parseMealRequestInput,
  parseMealRequestStatusInput,
  parseMealRecordInput,
  parsePreferenceInput,
  type MealRequest,
  type MealRequestStatus,
  type MealRecord,
  type TastePreference
} from "@couple-life/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../../db/client.js";
import { appendLifeEvent } from "../life/timeline-repository.js";

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

interface MealRequestRow {
  id: string;
  requester: MealRequest["requester"];
  target: MealRequest["target"];
  title: string;
  vendor_name: string | null;
  note: string | null;
  status: MealRequestStatus;
  created_at: string;
  updated_at: string;
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

export interface ConfirmedMealMemory {
  meal: MealRecord;
  preferences: TastePreference[];
  memoryText: string;
}

interface MealMemoryRow {
  id: string;
  content: string;
  created_at: string;
  meal_id: string;
  occurred_on: string;
  meal_kind: MealRecord["mealKind"];
  person: MealRecord["person"];
  vendor_name: string;
  items_json: string;
  amount_cents: number | null;
  rating: number | null;
  note: string | null;
  meal_created_at: string;
}

export interface MealMemorySummary {
  id: string;
  content: string;
  createdAt: string;
  meal: MealRecord;
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

function mapMealRequest(row: MealRequestRow): MealRequest {
  return {
    id: row.id,
    requester: row.requester,
    target: row.target,
    title: row.title,
    vendorName: row.vendor_name,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMealMemory(row: MealMemoryRow): MealMemorySummary {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    meal: mapMealRecord({
      id: row.meal_id,
      occurred_on: row.occurred_on,
      meal_kind: row.meal_kind,
      person: row.person,
      vendor_name: row.vendor_name,
      items_json: row.items_json,
      amount_cents: row.amount_cents,
      rating: row.rating,
      note: row.note,
      created_at: row.meal_created_at
    })
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

  appendLifeEvent(database, {
    eventType: "meal",
    title: "记录一餐",
    subtitle: parsed.vendorName,
    metadata: {
      mealRecordId: id,
      occurredOn: parsed.occurredOn,
      mealKind: parsed.mealKind,
      person: parsed.person,
      items: parsed.items,
      amountCents: parsed.amountCents
    }
  });

  return mapMealRecord(row);
}

export function listRecentMealRecords(database: AppDatabase, limit: number): MealRecord[] {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const rows = database.sqlite
    .prepare("select * from meal_records order by occurred_on desc, created_at desc limit ?")
    .all(safeLimit) as MealRecordRow[];

  return rows.map(mapMealRecord);
}

export function createMealRequest(database: AppDatabase, input: unknown): MealRequest {
  const parsed = parseMealRequestInput(input);
  const id = nanoid();

  database.sqlite
    .prepare(`
      insert into meal_requests (
        id,
        requester,
        target,
        title,
        vendor_name,
        note
      ) values (?, ?, ?, ?, ?, ?)
    `)
    .run(id, parsed.requester, parsed.target, parsed.title, parsed.vendorName, parsed.note);

  const row = database.sqlite
    .prepare("select * from meal_requests where id = ?")
    .get(id) as MealRequestRow;

  appendLifeEvent(database, {
    eventType: "meal_request",
    title: "想吃请求",
    subtitle: parsed.title,
    metadata: {
      mealRequestId: id,
      requester: parsed.requester,
      target: parsed.target,
      vendorName: parsed.vendorName
    }
  });

  return mapMealRequest(row);
}

export function listPendingMealRequests(database: AppDatabase): MealRequest[] {
  const rows = database.sqlite
    .prepare("select * from meal_requests where status = 'pending' order by created_at desc")
    .all() as MealRequestRow[];

  return rows.map(mapMealRequest);
}

export function updateMealRequestStatus(database: AppDatabase, id: string, input: unknown): MealRequest {
  const parsed = parseMealRequestStatusInput(input);

  database.sqlite
    .prepare("update meal_requests set status = ?, updated_at = CURRENT_TIMESTAMP where id = ?")
    .run(parsed.status, id);

  const row = database.sqlite
    .prepare("select * from meal_requests where id = ?")
    .get(id) as MealRequestRow | undefined;

  if (!row) {
    throw new Error("meal request not found");
  }

  if (parsed.status !== "pending") {
    appendLifeEvent(database, {
      eventType: "meal_request",
      title: parsed.status === "planned" ? "安排想吃请求" : "放下想吃请求",
      subtitle: row.title,
      metadata: {
        mealRequestId: row.id,
        status: parsed.status,
        requester: row.requester,
        target: row.target
      }
    });
  }

  return mapMealRequest(row);
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

export function listMealMemories(database: AppDatabase, limit: number): MealMemorySummary[] {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const rows = database.sqlite
    .prepare(`
      select
        meal_memory_entries.id,
        meal_memory_entries.content,
        meal_memory_entries.created_at,
        meal_records.id as meal_id,
        meal_records.occurred_on,
        meal_records.meal_kind,
        meal_records.person,
        meal_records.vendor_name,
        meal_records.items_json,
        meal_records.amount_cents,
        meal_records.rating,
        meal_records.note,
        meal_records.created_at as meal_created_at
      from meal_memory_entries
      join meal_records on meal_records.id = meal_memory_entries.meal_record_id
      order by meal_memory_entries.created_at desc
      limit ?
    `)
    .all(safeLimit) as MealMemoryRow[];

  return rows.map(mapMealMemory);
}

export function deleteMealMemory(database: AppDatabase, id: string): boolean {
  const existing = database.sqlite
    .prepare("select meal_record_id from meal_memory_entries where id = ?")
    .get(id) as { meal_record_id: string } | undefined;

  if (!existing) {
    return false;
  }

  database.sqlite.exec("begin");

  try {
    database.sqlite
      .prepare("delete from memory_embeddings where source_table = ? and source_id = ?")
      .run("meal_records", existing.meal_record_id);
    database.sqlite.prepare("delete from meal_memory_entries where id = ?").run(id);
    database.sqlite.exec("commit");
  } catch (error) {
    database.sqlite.exec("rollback");
    throw error;
  }

  return true;
}

function normalizeMemoryContent(content: unknown): string {
  if (typeof content !== "string") {
    throw new Error("memory content is required");
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    throw new Error("memory content is required");
  }

  return trimmedContent;
}

function insertMealMemory(database: AppDatabase, mealRecordId: string, content: string): string {
  const id = nanoid();
  const embeddingId = nanoid();

  database.sqlite
    .prepare("insert into meal_memory_entries (id, meal_record_id, content) values (?, ?, ?)")
    .run(id, mealRecordId, content);

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
      content,
      "[]",
      JSON.stringify({ mealRecordId })
    );

  return id;
}

export function createMealMemory(database: AppDatabase, mealRecordId: string, content: unknown): string {
  const trimmedContent = normalizeMemoryContent(content);

  database.sqlite.exec("begin");

  try {
    const id = insertMealMemory(database, mealRecordId, trimmedContent);
    database.sqlite.exec("commit");
    return id;
  } catch (error) {
    database.sqlite.exec("rollback");
    throw error;
  }
}

export function saveConfirmedMealMemory(
  database: AppDatabase,
  mealRecordInput: unknown,
  preferenceInputs: unknown[],
  memoryText: unknown
): ConfirmedMealMemory {
  const normalizedMemoryText = normalizeMemoryContent(memoryText);

  database.sqlite.exec("begin");

  try {
    const meal = createMealRecord(database, mealRecordInput);
    const preferences = preferenceInputs.map((preferenceInput) =>
      upsertTastePreference(database, preferenceInput)
    );

    insertMealMemory(database, meal.id, normalizedMemoryText);

    database.sqlite.exec("commit");

    return {
      meal,
      preferences,
      memoryText: normalizedMemoryText
    };
  } catch (error) {
    database.sqlite.exec("rollback");
    throw error;
  }
}
