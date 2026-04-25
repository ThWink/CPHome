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
