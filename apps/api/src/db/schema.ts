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

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  occurredOn: text("occurred_on").notNull(),
  category: text("category", {
    enum: ["takeout", "groceries", "daily", "rent", "utilities", "transport", "entertainment", "other"]
  }).notNull(),
  payer: text("payer", { enum: ["self", "partner", "both"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const parcels = sqliteTable("parcels", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  pickupCode: text("pickup_code").notNull(),
  location: text("location").notNull(),
  owner: text("owner", { enum: ["self", "partner", "both"] }).notNull(),
  status: text("status", { enum: ["pending", "picked", "canceled"] }).notNull(),
  note: text("note"),
  imagePath: text("image_path"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const waterDrinks = sqliteTable("water_drinks", {
  id: text("id").primaryKey(),
  person: text("person", { enum: ["self", "partner", "both"] }).notNull(),
  occurredOn: text("occurred_on").notNull(),
  amountMl: integer("amount_ml").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  assignee: text("assignee", { enum: ["self", "partner", "both"] }).notNull(),
  dueOn: text("due_on"),
  status: text("status", { enum: ["open", "done"] }).notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const anniversaries = sqliteTable("anniversaries", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  repeat: text("repeat", { enum: ["none", "yearly"] }).notNull(),
  remindDaysBefore: integer("remind_days_before").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const lifeEvents = sqliteTable("life_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  occurredAt: text("occurred_at").notNull(),
  metadataJson: text("metadata_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const schema = {
  couples,
  users,
  coupleMembers,
  mealRecords,
  tastePreferences,
  mealMemoryEntries,
  memoryEmbeddings,
  expenses,
  parcels,
  waterDrinks,
  todos,
  anniversaries,
  lifeEvents
};
