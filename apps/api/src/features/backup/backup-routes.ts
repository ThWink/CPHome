import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../../db/client.js";

export interface BackupRouteOptions {
  database: AppDatabase;
}

const backupTables = [
  "couples",
  "users",
  "couple_members",
  "meal_records",
  "meal_requests",
  "taste_preferences",
  "meal_memory_entries",
  "memory_embeddings",
  "expenses",
  "parcels",
  "water_drinks",
  "water_reminders",
  "todos",
  "anniversaries",
  "life_events"
] as const;

type BackupTable = typeof backupTables[number];

export interface BackupSnapshot {
  version: 1;
  exportedAt: string;
  tableCounts: Record<BackupTable, number>;
  tables: Record<BackupTable, Array<Record<string, unknown>>>;
}

export interface BackupImportResult {
  version: 1;
  importedAt: string;
  tableCounts: Record<BackupTable, number>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireBackupSnapshot(value: unknown): BackupSnapshot {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.tables)) {
    throw new Error("backup must be a version 1 snapshot");
  }

  const tables = {} as BackupSnapshot["tables"];
  const tableCounts = {} as BackupSnapshot["tableCounts"];

  for (const tableName of backupTables) {
    const rows = value.tables[tableName];
    if (!Array.isArray(rows)) {
      throw new Error(`backup table ${tableName} is required`);
    }

    tables[tableName] = rows.map((row) => {
      if (!isRecord(row)) {
        throw new Error(`backup table ${tableName} contains invalid rows`);
      }

      return row;
    });
    tableCounts[tableName] = tables[tableName].length;
  }

  return {
    version: 1,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
    tableCounts,
    tables
  };
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function getColumns(database: AppDatabase, tableName: BackupTable): string[] {
  return database.sqlite
    .prepare(`pragma table_info(${tableName})`)
    .all()
    .map((row) => (row as { name: string }).name);
}

function insertRows(
  database: AppDatabase,
  tableName: BackupTable,
  rows: Array<Record<string, unknown>>
): void {
  const columns = getColumns(database, tableName);

  for (const row of rows) {
    const rowColumns = columns.filter((column) => Object.hasOwn(row, column));
    if (rowColumns.length === 0) {
      continue;
    }

    const columnSql = rowColumns.map(quoteIdentifier).join(", ");
    const placeholderSql = rowColumns.map(() => "?").join(", ");
    const values = rowColumns.map((column) => row[column]);

    database.sqlite
      .prepare(`insert into ${tableName} (${columnSql}) values (${placeholderSql})`)
      .run(...values);
  }
}

export function exportBackup(database: AppDatabase): BackupSnapshot {
  const tables = {} as BackupSnapshot["tables"];
  const tableCounts = {} as BackupSnapshot["tableCounts"];

  for (const tableName of backupTables) {
    const rows = database.sqlite
      .prepare(`select * from ${tableName}`)
      .all() as Array<Record<string, unknown>>;

    tables[tableName] = rows;
    tableCounts[tableName] = rows.length;
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tableCounts,
    tables
  };
}

export function importBackup(database: AppDatabase, value: unknown): BackupImportResult {
  const backup = requireBackupSnapshot(value);

  database.sqlite.exec("begin");

  try {
    for (const tableName of [...backupTables].reverse()) {
      database.sqlite.prepare(`delete from ${tableName}`).run();
    }

    for (const tableName of backupTables) {
      insertRows(database, tableName, backup.tables[tableName]);
    }

    database.sqlite.exec("commit");
  } catch (error) {
    database.sqlite.exec("rollback");
    throw error;
  }

  return {
    version: 1,
    importedAt: new Date().toISOString(),
    tableCounts: backup.tableCounts
  };
}

export async function registerBackupRoutes(
  app: FastifyInstance,
  options: BackupRouteOptions
): Promise<void> {
  app.get("/api/backup/export", async () => ({
    backup: exportBackup(options.database)
  }));

  app.post("/api/backup/import", async (request, reply) => {
    const body = isRecord(request.body) ? request.body : {};

    if (body.confirm !== "RESTORE_LOCAL_DATA") {
      return reply.code(400).send({
        error: "BACKUP_IMPORT_CONFIRMATION_REQUIRED",
        message: "backup import requires RESTORE_LOCAL_DATA confirmation"
      });
    }

    try {
      return {
        imported: importBackup(options.database, body.backup)
      };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_BACKUP",
          message: error.message
        });
      }

      throw error;
    }
  });
}
