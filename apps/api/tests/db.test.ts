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

    try {
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
      expect(tables).toContain("expenses");
      expect(tables).toContain("parcels");
      expect(tables).toContain("water_drinks");

      const mealColumns = database.sqlite
        .prepare("pragma table_info(meal_records)")
        .all()
        .map((row) => (row as { name: string }).name);

      expect(mealColumns).toContain("meal_kind");
      expect(mealColumns).toContain("person");
    } finally {
      database.sqlite.close();
    }
  });
});
