# Meal Memory Recommendation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend slice for takeout-first meal memory, user-confirmed AI memory capture, taste preferences, meal recommendations, and roulette candidates.

**Architecture:** Keep this slice backend-only and testable through Fastify injection tests. Shared contracts live in `packages/shared`, SQLite persistence lives behind focused meal repository functions, and recommendation logic is deterministic rule-based so the API works before real LLM and embedding providers are connected.

**Tech Stack:** TypeScript, Fastify, Node.js 22, `node:sqlite`, Vitest, pnpm workspace.

---

## Scope

This plan implements:

- Manual meal record creation.
- Natural-language meal memory parsing with a deterministic parser.
- User confirmation before saving parsed meal memory.
- Taste preference storage.
- Local memory indexing into `memory_embeddings` with empty embedding arrays.
- Recommendation API returning three recommendations and weighted roulette candidates.

This plan does not implement:

- Real LLM provider calls.
- Real embedding generation.
- WeChat Mini Program pages.
- Expense one-click bookkeeping.
- Weather provider integration.

## File Structure

Create or modify these files:

```text
packages/shared/
├── src/
│   ├── index.ts
│   └── meal.ts
└── tests/
    └── meal.test.ts

apps/api/
├── src/
│   ├── db/
│   │   ├── migrations.ts
│   │   └── schema.ts
│   ├── features/
│   │   └── meals/
│   │       ├── meal-memory-parser.ts
│   │       ├── meal-recommendation-service.ts
│   │       ├── meal-repository.ts
│   │       └── meal-routes.ts
│   └── server/
│       └── build-app.ts
└── tests/
    ├── meal-memory-parser.test.ts
    ├── meal-recommendation.test.ts
    ├── meal-repository.test.ts
    └── meal-routes.test.ts
```

---

### Task 1: Add Shared Meal Contracts

**Files:**
- Create: `packages/shared/src/meal.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/meal.test.ts`

- [ ] **Step 1: Write failing shared meal contract tests**

Create `packages/shared/tests/meal.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  parseMealRecordInput,
  parsePreferenceInput,
  parseRecommendationRequest
} from "../src/meal.js";

describe("meal shared contracts", () => {
  it("normalizes a manual takeout record", () => {
    const record = parseMealRecordInput({
      occurredOn: "2026-04-25",
      mealKind: "takeout",
      person: "both",
      vendorName: "  麻辣烫店  ",
      items: [" 麻辣烫 ", " 可乐 "],
      amountCents: 4500,
      rating: 4,
      note: "  不要太辣  "
    });

    expect(record).toEqual({
      occurredOn: "2026-04-25",
      mealKind: "takeout",
      person: "both",
      vendorName: "麻辣烫店",
      items: ["麻辣烫", "可乐"],
      amountCents: 4500,
      rating: 4,
      note: "不要太辣"
    });
  });

  it("rejects invalid amounts and ratings", () => {
    expect(() =>
      parseMealRecordInput({
        occurredOn: "2026-04-25",
        mealKind: "takeout",
        person: "both",
        vendorName: "麻辣烫店",
        items: ["麻辣烫"],
        amountCents: -1,
        rating: 6,
        note: null
      })
    ).toThrow("amountCents must be a non-negative integer");
  });

  it("normalizes taste preference input", () => {
    const preference = parsePreferenceInput({
      person: "partner",
      category: "taste",
      value: "  不要太辣  ",
      sentiment: "avoid",
      weight: -30,
      note: "  微辣可以  "
    });

    expect(preference).toEqual({
      person: "partner",
      category: "taste",
      value: "不要太辣",
      sentiment: "avoid",
      weight: -30,
      note: "微辣可以"
    });
  });

  it("defaults recommendation request options", () => {
    const request = parseRecommendationRequest({});

    expect(request).toEqual({
      weather: "normal",
      budget: "normal",
      maxRecentDays: 3
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
corepack pnpm --filter @couple-life/shared test -- tests/meal.test.ts
```

Expected: FAIL with an import error for `../src/meal.js`.

- [ ] **Step 3: Implement shared meal contracts**

Create `packages/shared/src/meal.ts`:

```ts
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

  const text = normalizeRequiredText(value, fieldName);
  return text.length === 0 ? null : text;
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fieldName: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value as T;
}

function normalizeDate(value: unknown): string {
  const date = normalizeRequiredText(value, "occurredOn");
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) {
    throw new Error("occurredOn must use YYYY-MM-DD");
  }

  return date;
}

function normalizeAmount(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("amountCents must be a non-negative integer");
  }

  return value;
}

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("rating must be an integer from 1 to 5");
  }

  return value;
}

function normalizeItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("items must be an array");
  }

  const items = value
    .map((item) => normalizeRequiredText(item, "items"))
    .filter((item) => item.length > 0);

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

  if (!Number.isInteger(weight) || weight < -100 || weight > 100) {
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

  if (!Number.isInteger(maxRecentDays) || maxRecentDays < 1 || maxRecentDays > 30) {
    throw new Error("maxRecentDays must be an integer from 1 to 30");
  }

  return {
    weather: record.weather === undefined ? "normal" : normalizeEnum(record.weather, weatherMoods, "weather"),
    budget: record.budget === undefined ? "normal" : normalizeEnum(record.budget, budgetMoods, "budget"),
    maxRecentDays
  };
}
```

Modify `packages/shared/src/index.ts`:

```ts
export type {
  CoupleRole,
  InitializeCoupleInput,
  InitializeCoupleResult,
  SetupStatus
} from "./setup.js";

export { parseInitializeCoupleInput } from "./setup.js";

export type {
  BudgetMood,
  MealKind,
  MealMemoryParseRequest,
  MealMemoryParseResult,
  MealRecommendation,
  MealRecommendationsResponse,
  MealRecord,
  MealRecordInput,
  PersonTarget,
  PreferenceCategory,
  PreferenceInput,
  PreferenceSentiment,
  RecommendationRequest,
  RecommendationSlot,
  TastePreference,
  WeatherMood
} from "./meal.js";

export {
  parseMealRecordInput,
  parsePreferenceInput,
  parseRecommendationRequest
} from "./meal.js";
```

- [ ] **Step 4: Run shared tests and typecheck**

Run:

```powershell
corepack pnpm --filter @couple-life/shared test
corepack pnpm --filter @couple-life/shared typecheck
corepack pnpm --filter @couple-life/shared build
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

Run:

```powershell
git add packages/shared
git commit -m "feat: add meal shared contracts"
```

Expected: commit succeeds.

---

### Task 2: Extend SQLite Schema For Meal Memory

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/db/migrations.ts`
- Test: `apps/api/tests/db.test.ts`

- [ ] **Step 1: Expand database test**

Replace `apps/api/tests/db.test.ts` with:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrations.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("database migrations", () => {
  it("creates foundation and meal memory tables", () => {
    const dir = mkdtempSync(join(tmpdir(), "couple-life-db-"));
    tempDirs.push(dir);

    const database = openDatabase(`file:${join(dir, "app.db")}`);
    runMigrations(database.sqlite);

    const tables = database.sqlite
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toContain("couples");
    expect(tables).toContain("users");
    expect(tables).toContain("couple_members");
    expect(tables).toContain("meal_records");
    expect(tables).toContain("taste_preferences");
    expect(tables).toContain("meal_memory_entries");
    expect(tables).toContain("memory_embeddings");

    const mealColumns = database.sqlite
      .prepare("pragma table_info(meal_records)")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(mealColumns).toContain("meal_kind");
    expect(mealColumns).toContain("person");

    database.sqlite.close();
  });
});
```

- [ ] **Step 2: Run database test to verify it fails**

Run:

```powershell
corepack pnpm --filter @couple-life/api test -- tests/db.test.ts
```

Expected: FAIL because `taste_preferences` and `meal_memory_entries` do not exist.

- [ ] **Step 3: Update schema definitions**

Replace `apps/api/src/db/schema.ts` with:

```ts
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const couples = sqliteTable("couples", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const coupleMembers = sqliteTable("couple_members", {
  id: text("id").primaryKey(),
  coupleId: text("couple_id").notNull().references(() => couples.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role", { enum: ["self", "partner"] }).notNull(),
  joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const mealRecords = sqliteTable("meal_records", {
  id: text("id").primaryKey(),
  occurredOn: text("occurred_on").notNull(),
  mealKind: text("meal_kind", { enum: ["takeout", "home_cooked", "dine_in"] }).notNull(),
  person: text("person", { enum: ["self", "partner", "both"] }).notNull(),
  vendorName: text("vendor_name").notNull(),
  itemsJson: text("items_json").notNull(),
  amountCents: integer("amount_cents"),
  rating: integer("rating"),
  note: text("note"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const tastePreferences = sqliteTable(
  "taste_preferences",
  {
    id: text("id").primaryKey(),
    person: text("person", { enum: ["self", "partner", "both"] }).notNull(),
    category: text("category", { enum: ["dish", "cuisine", "taste", "ingredient", "vendor"] }).notNull(),
    value: text("value").notNull(),
    sentiment: text("sentiment", { enum: ["like", "dislike", "avoid"] }).notNull(),
    weight: integer("weight").notNull(),
    note: text("note"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    uniquePreference: uniqueIndex("idx_taste_preferences_unique").on(
      table.person,
      table.category,
      table.value
    )
  })
);

export const mealMemoryEntries = sqliteTable("meal_memory_entries", {
  id: text("id").primaryKey(),
  mealRecordId: text("meal_record_id").notNull().references(() => mealRecords.id),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const memoryEmbeddings = sqliteTable("memory_embeddings", {
  id: text("id").primaryKey(),
  memoryType: text("memory_type").notNull(),
  sourceTable: text("source_table").notNull(),
  sourceId: text("source_id").notNull(),
  content: text("content").notNull(),
  embeddingJson: text("embedding_json").notNull(),
  metadataJson: text("metadata_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const schema = {
  couples,
  users,
  coupleMembers,
  mealRecords,
  tastePreferences,
  mealMemoryEntries,
  memoryEmbeddings
};
```

- [ ] **Step 4: Update migrations**

Replace `apps/api/src/db/migrations.ts` with:

```ts
import type { SqliteDatabase } from "./client.js";

function columnExists(sqlite: SqliteDatabase, tableName: string, columnName: string): boolean {
  return sqlite
    .prepare(`pragma table_info(${tableName})`)
    .all()
    .some((row) => (row as { name: string }).name === columnName);
}

export function runMigrations(sqlite: SqliteDatabase): void {
  sqlite.exec(`
    create table if not exists couples (
      id text primary key,
      name text not null,
      invite_code text not null unique,
      created_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists users (
      id text primary key,
      display_name text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists couple_members (
      id text primary key,
      couple_id text not null references couples(id),
      user_id text not null references users(id),
      role text not null check (role in ('self', 'partner')),
      joined_at text not null default CURRENT_TIMESTAMP,
      unique (couple_id, user_id),
      unique (couple_id, role)
    );

    create table if not exists meal_records (
      id text primary key,
      occurred_on text not null,
      vendor_name text not null,
      items_json text not null,
      amount_cents integer,
      rating integer check (rating is null or (rating >= 1 and rating <= 5)),
      note text,
      created_at text not null default CURRENT_TIMESTAMP
    );
  `);

  if (!columnExists(sqlite, "meal_records", "meal_kind")) {
    sqlite.exec("alter table meal_records add column meal_kind text not null default 'takeout'");
  }

  if (!columnExists(sqlite, "meal_records", "person")) {
    sqlite.exec("alter table meal_records add column person text not null default 'both'");
  }

  sqlite.exec(`
    create table if not exists taste_preferences (
      id text primary key,
      person text not null check (person in ('self', 'partner', 'both')),
      category text not null check (category in ('dish', 'cuisine', 'taste', 'ingredient', 'vendor')),
      value text not null,
      sentiment text not null check (sentiment in ('like', 'dislike', 'avoid')),
      weight integer not null check (weight >= -100 and weight <= 100),
      note text,
      created_at text not null default CURRENT_TIMESTAMP,
      updated_at text not null default CURRENT_TIMESTAMP,
      unique (person, category, value)
    );

    create table if not exists meal_memory_entries (
      id text primary key,
      meal_record_id text not null references meal_records(id),
      content text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists memory_embeddings (
      id text primary key,
      memory_type text not null,
      source_table text not null,
      source_id text not null,
      content text not null,
      embedding_json text not null,
      metadata_json text not null,
      created_at text not null default CURRENT_TIMESTAMP,
      updated_at text not null default CURRENT_TIMESTAMP
    );

    create index if not exists idx_memory_embeddings_type
      on memory_embeddings(memory_type);

    create index if not exists idx_memory_embeddings_source
      on memory_embeddings(source_table, source_id);

    create index if not exists idx_meal_records_occurred_on
      on meal_records(occurred_on);

    create index if not exists idx_taste_preferences_lookup
      on taste_preferences(person, category, value);
  `);
}
```

- [ ] **Step 5: Run database tests and typecheck**

Run:

```powershell
corepack pnpm --filter @couple-life/api test -- tests/db.test.ts
corepack pnpm --filter @couple-life/api typecheck
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

Run:

```powershell
git add apps/api/src/db apps/api/tests/db.test.ts
git commit -m "feat: add meal memory schema"
```

Expected: commit succeeds.

---

### Task 3: Add Meal Repository

**Files:**
- Create: `apps/api/src/features/meals/meal-repository.ts`
- Test: `apps/api/tests/meal-repository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Create `apps/api/tests/meal-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { openDatabase } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrations.js";
import {
  createMealMemory,
  createMealRecord,
  listRecentMealRecords,
  listTastePreferences,
  upsertTastePreference
} from "../src/features/meals/meal-repository.js";

describe("meal repository", () => {
  it("stores and lists meal records", () => {
    const database = openDatabase(":memory:");
    runMigrations(database.sqlite);

    const meal = createMealRecord(database, {
      occurredOn: "2026-04-25",
      mealKind: "takeout",
      person: "both",
      vendorName: "麻辣烫店",
      items: ["麻辣烫"],
      amountCents: 4500,
      rating: 4,
      note: "微辣可以"
    });

    const recent = listRecentMealRecords(database, 5);

    expect(meal.id).toEqual(expect.any(String));
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({
      vendorName: "麻辣烫店",
      items: ["麻辣烫"],
      amountCents: 4500
    });

    database.sqlite.close();
  });

  it("upserts taste preferences", () => {
    const database = openDatabase(":memory:");
    runMigrations(database.sqlite);

    upsertTastePreference(database, {
      person: "partner",
      category: "taste",
      value: "不要太辣",
      sentiment: "avoid",
      weight: -30,
      note: "微辣可以"
    });

    upsertTastePreference(database, {
      person: "partner",
      category: "taste",
      value: "不要太辣",
      sentiment: "avoid",
      weight: -50,
      note: "最近更怕辣"
    });

    const preferences = listTastePreferences(database);

    expect(preferences).toHaveLength(1);
    expect(preferences[0]).toMatchObject({
      value: "不要太辣",
      weight: -50,
      note: "最近更怕辣"
    });

    database.sqlite.close();
  });

  it("stores confirmed memory and local vector placeholder", () => {
    const database = openDatabase(":memory:");
    runMigrations(database.sqlite);

    const meal = createMealRecord(database, {
      occurredOn: "2026-04-25",
      mealKind: "takeout",
      person: "both",
      vendorName: "黄焖鸡米饭",
      items: ["黄焖鸡"],
      amountCents: 4200,
      rating: 2,
      note: "有点腻"
    });

    createMealMemory(database, meal.id, "黄焖鸡有点腻，下次少推荐。");

    const memory = database.sqlite
      .prepare("select content from meal_memory_entries where meal_record_id = ?")
      .get(meal.id) as { content: string };

    const embedding = database.sqlite
      .prepare("select embedding_json from memory_embeddings where source_id = ?")
      .get(meal.id) as { embedding_json: string };

    expect(memory.content).toBe("黄焖鸡有点腻，下次少推荐。");
    expect(embedding.embedding_json).toBe("[]");

    database.sqlite.close();
  });
});
```

- [ ] **Step 2: Run repository tests to verify they fail**

Run:

```powershell
corepack pnpm --filter @couple-life/api test -- tests/meal-repository.test.ts
```

Expected: FAIL with an import error for `../src/features/meals/meal-repository.js`.

- [ ] **Step 3: Implement repository**

Create `apps/api/src/features/meals/meal-repository.ts`:

```ts
import {
  parseMealRecordInput,
  parsePreferenceInput,
  type MealRecord,
  type MealRecordInput,
  type PreferenceInput,
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

export function createMealRecord(database: AppDatabase, input: MealRecordInput): MealRecord {
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
  const rows = database.sqlite
    .prepare("select * from meal_records order by occurred_on desc, created_at desc limit ?")
    .all(limit) as MealRecordRow[];

  return rows.map(mapMealRecord);
}

export function upsertTastePreference(database: AppDatabase, input: PreferenceInput): TastePreference {
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
  const id = nanoid();
  const embeddingId = nanoid();

  database.sqlite.exec("begin");

  try {
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

    database.sqlite.exec("commit");
  } catch (error) {
    database.sqlite.exec("rollback");
    throw error;
  }

  return id;
}
```

- [ ] **Step 4: Run repository tests and typecheck**

Run:

```powershell
corepack pnpm --filter @couple-life/api test -- tests/meal-repository.test.ts
corepack pnpm --filter @couple-life/api typecheck
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

Run:

```powershell
git add apps/api/src/features/meals/meal-repository.ts apps/api/tests/meal-repository.test.ts
git commit -m "feat: add meal repository"
```

Expected: commit succeeds.

---

### Task 4: Add Deterministic Meal Memory Parser

**Files:**
- Create: `apps/api/src/features/meals/meal-memory-parser.ts`
- Test: `apps/api/tests/meal-memory-parser.test.ts`

- [ ] **Step 1: Write failing parser tests**

Create `apps/api/tests/meal-memory-parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseMealMemoryText } from "../src/features/meals/meal-memory-parser.js";

describe("parseMealMemoryText", () => {
  it("parses takeout memory with amount and spicy preference", () => {
    const result = parseMealMemoryText({
      text: "今天吃了麻辣烫，花了45，她觉得不错但不要太辣。",
      occurredOn: "2026-04-25",
      person: "partner"
    });

    expect(result).toEqual({
      confirmationRequired: true,
      mealRecord: {
        occurredOn: "2026-04-25",
        mealKind: "takeout",
        person: "partner",
        vendorName: "麻辣烫",
        items: ["麻辣烫"],
        amountCents: 4500,
        rating: 4,
        note: "她觉得不错但不要太辣"
      },
      preferenceUpdates: [
        {
          person: "partner",
          category: "taste",
          value: "不要太辣",
          sentiment: "avoid",
          weight: -30,
          note: "微辣可以，避免太辣"
        },
        {
          person: "partner",
          category: "dish",
          value: "麻辣烫",
          sentiment: "like",
          weight: 30,
          note: "来自饮食记录：她觉得不错但不要太辣"
        }
      ],
      memoryText: "2026-04-25 吃了麻辣烫，花费45元，评价：她觉得不错但不要太辣。"
    });
  });

  it("parses tired-of-food memory as lower recommendation weight", () => {
    const result = parseMealMemoryText({
      text: "晚上吃了黄焖鸡，花了42，有点腻，下次少推荐。",
      occurredOn: "2026-04-25",
      person: "both"
    });

    expect(result.mealRecord).toMatchObject({
      vendorName: "黄焖鸡",
      items: ["黄焖鸡"],
      amountCents: 4200,
      rating: 2,
      note: "有点腻，下次少推荐"
    });

    expect(result.preferenceUpdates).toContainEqual({
      person: "both",
      category: "dish",
      value: "黄焖鸡",
      sentiment: "dislike",
      weight: -25,
      note: "有点腻，下次少推荐"
    });
  });
});
```

- [ ] **Step 2: Run parser tests to verify they fail**

Run:

```powershell
corepack pnpm --filter @couple-life/api test -- tests/meal-memory-parser.test.ts
```

Expected: FAIL with an import error for `../src/features/meals/meal-memory-parser.js`.

- [ ] **Step 3: Implement parser**

Create `apps/api/src/features/meals/meal-memory-parser.ts`:

```ts
import type {
  MealMemoryParseRequest,
  MealMemoryParseResult,
  PersonTarget,
  PreferenceInput
} from "@couple-life/shared";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizePerson(person: MealMemoryParseRequest["person"]): PersonTarget {
  return person ?? "both";
}

function extractAmountCents(text: string): number | null {
  const match = text.match(/(?:花了|花费|用了|价格|￥)\\s*(\\d+(?:\\.\\d+)?)/);
  if (!match) {
    return null;
  }

  return Math.round(Number(match[1]) * 100);
}

function extractDish(text: string): string {
  const match = text.match(/(?:吃了|点了|晚饭是|中午吃了|晚上吃了)([^，,。\\.]+)/);
  const raw = (match?.[1] ?? text)
    .replace(/花了\\s*\\d+(?:\\.\\d+)?/g, "")
    .replace(/花费\\s*\\d+(?:\\.\\d+)?/g, "")
    .replace(/用了\\s*\\d+(?:\\.\\d+)?/g, "")
    .trim();

  return raw.length > 0 ? raw : "外卖";
}

function extractNote(text: string): string | null {
  const parts = text
    .replace(/^.*?(?:，|,)/, "")
    .replace(/花了\\s*\\d+(?:\\.\\d+)?/g, "")
    .replace(/花费\\s*\\d+(?:\\.\\d+)?/g, "")
    .replace(/用了\\s*\\d+(?:\\.\\d+)?/g, "")
    .replace(/[。.]$/g, "")
    .trim();

  return parts.length > 0 ? parts : null;
}

function inferRating(text: string): number | null {
  if (/踩雷|难吃|不好吃|别再点/.test(text)) {
    return 1;
  }

  if (/腻|太油|下次少推荐|吃腻/.test(text)) {
    return 2;
  }

  if (/不错|好吃|喜欢|满意/.test(text)) {
    return 4;
  }

  return null;
}

function buildPreferenceUpdates(text: string, dish: string, person: PersonTarget, note: string | null): PreferenceInput[] {
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
      note: `来自饮食记录：${note ?? "正向评价"}`
    });
  }

  if (/腻|太油|下次少推荐|吃腻/.test(text)) {
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

export function parseMealMemoryText(input: MealMemoryParseRequest): MealMemoryParseResult {
  const text = input.text.trim();
  if (text.length === 0) {
    throw new Error("text is required");
  }

  const occurredOn = input.occurredOn ?? todayIsoDate();
  const person = normalizePerson(input.person);
  const dish = extractDish(text);
  const amountCents = extractAmountCents(text);
  const note = extractNote(text);
  const rating = inferRating(text);
  const amountText = amountCents === null ? "金额未记录" : `花费${amountCents / 100}元`;
  const noteText = note === null ? "没有补充评价" : `评价：${note}`;

  return {
    confirmationRequired: true,
    mealRecord: {
      occurredOn,
      mealKind: "takeout",
      person,
      vendorName: dish,
      items: [dish],
      amountCents,
      rating,
      note
    },
    preferenceUpdates: buildPreferenceUpdates(text, dish, person, note),
    memoryText: `${occurredOn} 吃了${dish}，${amountText}，${noteText}。`
  };
}
```

- [ ] **Step 4: Run parser tests and typecheck**

Run:

```powershell
corepack pnpm --filter @couple-life/api test -- tests/meal-memory-parser.test.ts
corepack pnpm --filter @couple-life/api typecheck
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

Run:

```powershell
git add apps/api/src/features/meals/meal-memory-parser.ts apps/api/tests/meal-memory-parser.test.ts
git commit -m "feat: add deterministic meal memory parser"
```

Expected: commit succeeds.

---

### Task 5: Add Recommendation Service

**Files:**
- Create: `apps/api/src/features/meals/meal-recommendation-service.ts`
- Test: `apps/api/tests/meal-recommendation.test.ts`

- [ ] **Step 1: Write failing recommendation tests**

Create `apps/api/tests/meal-recommendation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { openDatabase } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrations.js";
import { createMealRecord, upsertTastePreference } from "../src/features/meals/meal-repository.js";
import { recommendMeals } from "../src/features/meals/meal-recommendation-service.js";

describe("recommendMeals", () => {
  it("returns three recommendations and weighted roulette candidates", () => {
    const database = openDatabase(":memory:");
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

    database.sqlite.close();
  });
});
```

- [ ] **Step 2: Run recommendation tests to verify they fail**

Run:

```powershell
corepack pnpm --filter @couple-life/api test -- tests/meal-recommendation.test.ts
```

Expected: FAIL with an import error for `../src/features/meals/meal-recommendation-service.js`.

- [ ] **Step 3: Implement recommendation service**

Create `apps/api/src/features/meals/meal-recommendation-service.ts`:

```ts
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
    candidate.vendorName.includes(value) ||
    candidate.cuisine.includes(value) ||
    candidate.tags.some((tag) => tag.includes(value) || value.includes(tag))
  );
}

function applyWeatherScore(candidate: Candidate, request: RecommendationRequest): number {
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

function applyBudgetScore(candidate: Candidate, request: RecommendationRequest): number {
  if (request.budget === candidate.budget) {
    return 12;
  }

  if (request.budget === "save" && candidate.budget === "treat") {
    return -25;
  }

  return 0;
}

function scoreCandidates(database: AppDatabase, request: RecommendationRequest): ScoredCandidate[] {
  const recentMeals = listRecentMealRecords(database, 20);
  const preferences = listTastePreferences(database);

  return candidates
    .map((candidate) => {
      let score = candidate.baseWeight;

      for (const preference of preferences) {
        if (matchesCandidate(candidate, preference.value)) {
          score += preference.weight;
        }
      }

      for (const meal of recentMeals.slice(0, request.maxRecentDays)) {
        if (meal.items.some((item) => matchesCandidate(candidate, item)) || matchesCandidate(candidate, meal.vendorName)) {
          score -= 35;
        }
      }

      score += applyWeatherScore(candidate, request);
      score += applyBudgetScore(candidate, request);

      return {
        ...candidate,
        score
      };
    })
    .sort((a, b) => b.score - a.score);
}

function toRecommendation(slot: MealRecommendation["slot"], candidate: ScoredCandidate, reason: string): MealRecommendation {
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
  const fastest = [...scored].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes)[0];
  const favorite = scored[0];
  const today = scored.find((candidate) => candidate.title !== fastest.title && candidate.title !== favorite.title) ?? scored[1];

  return {
    recommendations: [
      toRecommendation("fastest", fastest, "配送时间最短，适合快速拍板。"),
      toRecommendation("favorite", favorite, "结合历史偏好后权重最高。"),
      toRecommendation("today", today, "综合天气、预算和最近吃过的记录。")
    ],
    rouletteCandidates: scored.slice(0, 5).map((candidate) =>
      toRecommendation("today", candidate, "转盘候选，权重越高越容易抽中。")
    )
  };
}
```

- [ ] **Step 4: Run recommendation tests and typecheck**

Run:

```powershell
corepack pnpm --filter @couple-life/api test -- tests/meal-recommendation.test.ts
corepack pnpm --filter @couple-life/api typecheck
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

Run:

```powershell
git add apps/api/src/features/meals/meal-recommendation-service.ts apps/api/tests/meal-recommendation.test.ts
git commit -m "feat: add meal recommendation service"
```

Expected: commit succeeds.

---

### Task 6: Add Meal API Routes

**Files:**
- Create: `apps/api/src/features/meals/meal-routes.ts`
- Modify: `apps/api/src/server/build-app.ts`
- Test: `apps/api/tests/meal-routes.test.ts`

- [ ] **Step 1: Write failing route tests**

Create `apps/api/tests/meal-routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("meal routes", () => {
  it("creates and lists manual meal records", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/meals/manual",
      payload: {
        occurredOn: "2026-04-25",
        mealKind: "takeout",
        person: "both",
        vendorName: "麻辣烫店",
        items: ["麻辣烫"],
        amountCents: 4500,
        rating: 4,
        note: "微辣可以"
      }
    });

    expect(createResponse.statusCode).toBe(201);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/meals/recent"
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      meals: [
        {
          vendorName: "麻辣烫店",
          items: ["麻辣烫"]
        }
      ]
    });

    await app.close();
  });

  it("parses and confirms meal memory", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    const parseResponse = await app.inject({
      method: "POST",
      url: "/api/meals/memory/parse",
      payload: {
        text: "今天吃了麻辣烫，花了45，她觉得不错但不要太辣。",
        occurredOn: "2026-04-25",
        person: "partner"
      }
    });

    expect(parseResponse.statusCode).toBe(200);
    const parsed = parseResponse.json();
    expect(parsed.confirmationRequired).toBe(true);

    const confirmResponse = await app.inject({
      method: "POST",
      url: "/api/meals/memory/confirm",
      payload: parsed
    });

    expect(confirmResponse.statusCode).toBe(201);
    expect(confirmResponse.json()).toMatchObject({
      meal: {
        vendorName: "麻辣烫",
        amountCents: 4500
      },
      preferences: [
        {
          value: "不要太辣"
        },
        {
          value: "麻辣烫"
        }
      ]
    });

    await app.close();
  });

  it("returns recommendations", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    const response = await app.inject({
      method: "POST",
      url: "/api/meals/recommendations",
      payload: {
        weather: "cold",
        budget: "normal",
        maxRecentDays: 3
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().recommendations).toHaveLength(3);
    expect(response.json().rouletteCandidates.length).toBeGreaterThanOrEqual(3);

    await app.close();
  });
});
```

- [ ] **Step 2: Run route tests to verify they fail**

Run:

```powershell
corepack pnpm --filter @couple-life/api test -- tests/meal-routes.test.ts
```

Expected: FAIL with route status `404`.

- [ ] **Step 3: Implement meal routes**

Create `apps/api/src/features/meals/meal-routes.ts`:

```ts
import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../../db/client.js";
import { parseMealMemoryText } from "./meal-memory-parser.js";
import { recommendMeals } from "./meal-recommendation-service.js";
import {
  createMealMemory,
  createMealRecord,
  listRecentMealRecords,
  listTastePreferences,
  upsertTastePreference
} from "./meal-repository.js";

export interface MealRouteOptions {
  database: AppDatabase;
}

export async function registerMealRoutes(
  app: FastifyInstance,
  options: MealRouteOptions
): Promise<void> {
  app.get("/api/meals/recent", async () => ({
    meals: listRecentMealRecords(options.database, 20)
  }));

  app.post("/api/meals/manual", async (request, reply) => {
    try {
      const meal = createMealRecord(options.database, request.body);
      return reply.code(201).send({ meal });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_MEAL_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/meals/preferences", async () => ({
    preferences: listTastePreferences(options.database)
  }));

  app.post("/api/meals/memory/parse", async (request, reply) => {
    try {
      return parseMealMemoryText(request.body as { text: string; occurredOn?: string; person?: "self" | "partner" | "both" });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_MEMORY_TEXT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/meals/memory/confirm", async (request, reply) => {
    try {
      const parsed = request.body as ReturnType<typeof parseMealMemoryText>;
      const meal = createMealRecord(options.database, parsed.mealRecord);
      const preferences = parsed.preferenceUpdates.map((preference) =>
        upsertTastePreference(options.database, preference)
      );

      createMealMemory(options.database, meal.id, parsed.memoryText);

      return reply.code(201).send({
        meal,
        preferences,
        memoryText: parsed.memoryText
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_MEMORY_CONFIRMATION",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/meals/recommendations", async (request, reply) => {
    try {
      return recommendMeals(options.database, request.body ?? {});
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_RECOMMENDATION_REQUEST",
          message: error.message
        });
      }

      throw error;
    }
  });
}
```

Modify `apps/api/src/server/build-app.ts`:

```ts
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { getEnv, type AppEnv } from "../config/env.js";
import { openDatabase, type AppDatabase } from "../db/client.js";
import { runMigrations } from "../db/migrations.js";
import { registerMealRoutes } from "../features/meals/meal-routes.js";
import { registerSetupRoutes } from "../features/setup/setup-routes.js";
import { registerHealthRoutes } from "./health-routes.js";

export interface BuildAppOptions {
  env?: AppEnv;
  database?: AppDatabase;
  databaseUrl?: string;
  logger?: boolean;
  runDatabaseMigrations?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? getEnv();
  const database =
    options.database ?? openDatabase(options.databaseUrl ?? env.DATABASE_URL);

  if (options.runDatabaseMigrations !== false) {
    runMigrations(database.sqlite);
  }

  const app = Fastify({
    logger: options.logger ?? env.NODE_ENV === "production"
  });

  app.addHook("onClose", async () => {
    database.sqlite.close();
  });

  await app.register(cors, {
    origin: true
  });

  await registerHealthRoutes(app, { database });
  await registerSetupRoutes(app, { database });
  await registerMealRoutes(app, { database });

  return app;
}
```

- [ ] **Step 4: Run route tests and API tests**

Run:

```powershell
corepack pnpm --filter @couple-life/api test -- tests/meal-routes.test.ts
corepack pnpm --filter @couple-life/api test
corepack pnpm --filter @couple-life/api typecheck
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

Run:

```powershell
git add apps/api/src/features/meals/meal-routes.ts apps/api/src/server/build-app.ts apps/api/tests/meal-routes.test.ts
git commit -m "feat: add meal memory api routes"
```

Expected: commit succeeds.

---

### Task 7: Verify Docker And CI Checks

**Files:**
- Read: `apps/api/Dockerfile`
- Read: `.github/workflows/ci.yml`

- [ ] **Step 1: Run full local verification**

Run:

```powershell
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
docker compose --env-file deploy/env.example -f deploy/docker-compose.yml build
```

Expected: all commands pass.

- [ ] **Step 2: Start API container and verify meal endpoints**

Run:

```powershell
docker compose --env-file deploy/env.example -f deploy/docker-compose.yml up -d
```

Expected: container starts.

Run:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health/ready' | ConvertTo-Json -Compress
```

Expected:

```json
{"status":"ok","checks":{"database":"ok"}}
```

Run:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3000/api/meals/recommendations' -ContentType 'application/json' -Body '{"weather":"cold","budget":"normal","maxRecentDays":3}' | ConvertTo-Json -Compress
```

Expected: JSON contains `recommendations` with 3 items and `rouletteCandidates` with at least 3 items.

- [ ] **Step 3: Stop API container**

Run:

```powershell
docker compose --env-file deploy/env.example -f deploy/docker-compose.yml down
```

Expected: container stops and is removed.

- [ ] **Step 4: Confirm clean Git state**

Run:

```powershell
git status --short
git log --oneline -8
```

Expected: `git status --short` prints no tracked-file changes. The log shows commits for shared contracts, schema, repository, parser, recommendation service, API routes, and foundation work.

---

## Self-Review Notes

Spec coverage for this plan:

- Covered: takeout-first meal records, AI-style memory parsing, user confirmation before saving, local structured memory, taste preferences, recommendation categories, roulette candidates, SQLite memory placeholder.
- Not covered by this plan: real LLM calls, real embeddings, weather API integration, expense one-click bookkeeping, Mini Program screens.

Type consistency:

- Shared meal input uses `occurredOn`, `mealKind`, `person`, `vendorName`, `items`, `amountCents`, `rating`, and `note`.
- Parser returns `MealMemoryParseResult` with `confirmationRequired`, `mealRecord`, `preferenceUpdates`, and `memoryText`.
- Recommendation response returns `recommendations` and `rouletteCandidates`.
- API routes use `/api/meals/manual`, `/api/meals/recent`, `/api/meals/preferences`, `/api/meals/memory/parse`, `/api/meals/memory/confirm`, and `/api/meals/recommendations`.
