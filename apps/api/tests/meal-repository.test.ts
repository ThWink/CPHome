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

    try {
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
    } finally {
      database.sqlite.close();
    }
  });

  it("upserts taste preferences", () => {
    const database = openDatabase(":memory:");

    try {
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
    } finally {
      database.sqlite.close();
    }
  });

  it("stores confirmed memory and local vector placeholder", () => {
    const database = openDatabase(":memory:");

    try {
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
    } finally {
      database.sqlite.close();
    }
  });
});
