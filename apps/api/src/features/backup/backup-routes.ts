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

export async function registerBackupRoutes(
  app: FastifyInstance,
  options: BackupRouteOptions
): Promise<void> {
  app.get("/api/backup/export", async () => ({
    backup: exportBackup(options.database)
  }));
}
