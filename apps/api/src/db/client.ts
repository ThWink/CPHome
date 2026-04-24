import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, resolve } from "node:path";

export interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): unknown;
  };
  close(): void;
}

export interface AppDatabase {
  sqlite: SqliteDatabase;
}

function resolveSqlitePath(databaseUrl: string): string {
  if (databaseUrl === ":memory:") {
    return databaseUrl;
  }

  const withoutScheme = databaseUrl.startsWith("file:")
    ? databaseUrl.slice("file:".length)
    : databaseUrl;

  return isAbsolute(withoutScheme) ? withoutScheme : resolve(process.cwd(), withoutScheme);
}

export function openDatabase(databaseUrl: string): AppDatabase {
  const sqlitePath = resolveSqlitePath(databaseUrl);

  if (sqlitePath !== ":memory:") {
    mkdirSync(dirname(sqlitePath), { recursive: true });
  }

  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };

  const sqlite = new DatabaseSync(sqlitePath);
  sqlite.exec("pragma foreign_keys = ON");

  if (sqlitePath !== ":memory:") {
    sqlite.exec("pragma journal_mode = WAL");
  }

  return {
    sqlite
  };
}
