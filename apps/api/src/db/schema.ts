import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  vendorName: text("vendor_name").notNull(),
  itemsJson: text("items_json").notNull(),
  amountCents: integer("amount_cents"),
  rating: integer("rating"),
  note: text("note"),
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
  memoryEmbeddings
};
