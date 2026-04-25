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
