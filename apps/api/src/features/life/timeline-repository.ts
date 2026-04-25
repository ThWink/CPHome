import type { LifeEvent, LifeEventType } from "@couple-life/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../../db/client.js";

interface LifeEventRow {
  id: string;
  event_type: LifeEventType;
  title: string;
  subtitle: string | null;
  occurred_at: string;
  metadata_json: string;
}

export interface AppendLifeEventInput {
  eventType: LifeEventType;
  title: string;
  subtitle?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

function mapLifeEvent(row: LifeEventRow): LifeEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    title: row.title,
    subtitle: row.subtitle,
    occurredAt: row.occurred_at,
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>
  };
}

export function appendLifeEvent(database: AppDatabase, input: AppendLifeEventInput): LifeEvent {
  const id = nanoid();
  const occurredAt = input.occurredAt ?? new Date().toISOString();

  database.sqlite
    .prepare(`
      insert into life_events (
        id,
        event_type,
        title,
        subtitle,
        occurred_at,
        metadata_json
      ) values (?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.eventType,
      input.title,
      input.subtitle ?? null,
      occurredAt,
      JSON.stringify(input.metadata ?? {})
    );

  const row = database.sqlite
    .prepare("select * from life_events where id = ?")
    .get(id) as LifeEventRow;

  return mapLifeEvent(row);
}

export function listLifeEvents(database: AppDatabase, limit = 20): LifeEvent[] {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const rows = database.sqlite
    .prepare(`
      select * from life_events
      order by occurred_at desc, rowid desc
      limit ?
    `)
    .all(safeLimit) as LifeEventRow[];

  return rows.map(mapLifeEvent);
}
