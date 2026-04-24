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
  it("creates foundation tables", () => {
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
    expect(tables).toContain("memory_embeddings");

    database.sqlite.close();
  });
});
