import type { AppDatabase } from "../db/client.js";

export interface DemoSeedOptions {
  today?: string;
}

export interface DemoSeedResult {
  coupleName: string;
  users: number;
  meals: number;
  preferences: number;
  expenses: number;
  parcels: number;
  waterDrinks: number;
  todos: number;
  anniversaries: number;
}

function normalizeSeedDate(value: string | undefined): string {
  if (value === undefined) {
    return new Date().toISOString().slice(0, 10);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("demo seed date must use YYYY-MM-DD");
  }

  return value;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function clearDemoTables(database: AppDatabase): void {
  database.sqlite.exec(`
    delete from memory_embeddings;
    delete from meal_memory_entries;
    delete from taste_preferences;
    delete from meal_records;
    delete from expenses;
    delete from parcels;
    delete from water_drinks;
    delete from todos;
    delete from anniversaries;
    delete from couple_members;
    delete from users;
    delete from couples;
  `);
}

function insertSetup(database: AppDatabase): void {
  database.sqlite
    .prepare("insert into couples (id, name, invite_code) values (?, ?, ?)")
    .run("demo-couple", "两人小家", "DEMO2026");
  database.sqlite
    .prepare("insert into users (id, display_name) values (?, ?)")
    .run("demo-self", "我");
  database.sqlite
    .prepare("insert into users (id, display_name) values (?, ?)")
    .run("demo-partner", "她");
  database.sqlite
    .prepare("insert into couple_members (id, couple_id, user_id, role) values (?, ?, ?, ?)")
    .run("demo-member-self", "demo-couple", "demo-self", "self");
  database.sqlite
    .prepare("insert into couple_members (id, couple_id, user_id, role) values (?, ?, ?, ?)")
    .run("demo-member-partner", "demo-couple", "demo-partner", "partner");
}

function insertMeals(database: AppDatabase, today: string): void {
  const yesterday = addDays(today, -1);
  const meals = [
    {
      id: "demo-meal-1",
      occurredOn: today,
      mealKind: "takeout",
      person: "both",
      vendorName: "小碗菜馆",
      items: ["番茄牛腩饭", "清炒时蔬"],
      amountCents: 4280,
      rating: 4,
      note: "她觉得番茄味舒服，下次可以少辣。"
    },
    {
      id: "demo-meal-2",
      occurredOn: yesterday,
      mealKind: "takeout",
      person: "both",
      vendorName: "砂锅粥铺",
      items: ["皮蛋瘦肉粥", "虾饺"],
      amountCents: 3600,
      rating: 5,
      note: "适合下雨天或者想吃清淡热乎的时候。"
    }
  ];

  for (const meal of meals) {
    database.sqlite
      .prepare(
        `insert into meal_records (
          id,
          occurred_on,
          meal_kind,
          person,
          vendor_name,
          items_json,
          amount_cents,
          rating,
          note
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        meal.id,
        meal.occurredOn,
        meal.mealKind,
        meal.person,
        meal.vendorName,
        JSON.stringify(meal.items),
        meal.amountCents,
        meal.rating,
        meal.note
      );
  }

  const memories = [
    {
      id: "demo-memory-1",
      embeddingId: "demo-embedding-1",
      mealRecordId: "demo-meal-1",
      content: "她喜欢番茄牛腩饭，接受少辣，不太想吃太油的外卖。"
    },
    {
      id: "demo-memory-2",
      embeddingId: "demo-embedding-2",
      mealRecordId: "demo-meal-2",
      content: "想吃清淡热乎的时候，砂锅粥铺是稳定选择。"
    }
  ];

  for (const memory of memories) {
    database.sqlite
      .prepare("insert into meal_memory_entries (id, meal_record_id, content) values (?, ?, ?)")
      .run(memory.id, memory.mealRecordId, memory.content);
    database.sqlite
      .prepare(
        `insert into memory_embeddings (
          id,
          memory_type,
          source_table,
          source_id,
          content,
          embedding_json,
          metadata_json
        ) values (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        memory.embeddingId,
        "meal",
        "meal_records",
        memory.mealRecordId,
        memory.content,
        "[]",
        JSON.stringify({ mealRecordId: memory.mealRecordId })
      );
  }
}

function insertPreferences(database: AppDatabase): void {
  const preferences = [
    ["demo-pref-1", "both", "taste", "少辣", "like", 60, "默认推荐少辣或微辣"],
    ["demo-pref-2", "partner", "dish", "热汤", "like", 50, "纠结时优先给热乎的选项"],
    ["demo-pref-3", "both", "ingredient", "油腻炸物", "avoid", -70, "连续两天不要推荐"],
    ["demo-pref-4", "partner", "vendor", "砂锅粥", "like", 50, "清淡晚餐备用"]
  ];

  for (const preference of preferences) {
    database.sqlite
      .prepare(
        `insert into taste_preferences (
          id,
          person,
          category,
          value,
          sentiment,
          weight,
          note
        ) values (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(...preference);
  }
}

function insertLifeData(database: AppDatabase, today: string): void {
  const tomorrow = addDays(today, 1);
  const anniversary = addDays(today, 25);

  database.sqlite
    .prepare(
      "insert into expenses (id, occurred_on, category, payer, amount_cents, note) values (?, ?, ?, ?, ?, ?)"
    )
    .run("demo-expense-1", today, "takeout", "both", 4280, "晚餐外卖");
  database.sqlite
    .prepare(
      "insert into expenses (id, occurred_on, category, payer, amount_cents, note) values (?, ?, ?, ?, ?, ?)"
    )
    .run("demo-expense-2", addDays(today, -1), "groceries", "self", 2600, "水果和酸奶");

  const parcels = [
    ["demo-parcel-1", "顺丰快递", "B-2048", "小区门口驿站", "partner", "pending", "下班顺手拿"],
    ["demo-parcel-2", "京东快递", "J-520", "快递柜 3 号", "both", "pending", "可能是日用品"]
  ];
  for (const parcel of parcels) {
    database.sqlite
      .prepare(
        "insert into parcels (id, title, pickup_code, location, owner, status, note) values (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(...parcel);
  }

  const waterDrinks = [
    ["demo-water-1", "self", today, 300],
    ["demo-water-2", "partner", today, 250],
    ["demo-water-3", "partner", today, 300]
  ];
  for (const drink of waterDrinks) {
    database.sqlite
      .prepare("insert into water_drinks (id, person, occurred_on, amount_ml) values (?, ?, ?, ?)")
      .run(...drink);
  }

  const todos = [
    ["demo-todo-1", "取快递顺手买酸奶", "self", today],
    ["demo-todo-2", "晚上决定外卖", "both", tomorrow]
  ];
  for (const todo of todos) {
    database.sqlite
      .prepare("insert into todos (id, title, assignee, due_on) values (?, ?, ?, ?)")
      .run(...todo);
  }

  database.sqlite
    .prepare(
      "insert into anniversaries (id, title, date, repeat, remind_days_before) values (?, ?, ?, ?, ?)"
    )
    .run("demo-anniversary-1", "在一起纪念日", anniversary, "yearly", 7);
}

export function seedDemoData(
  database: AppDatabase,
  options: DemoSeedOptions = {}
): DemoSeedResult {
  const today = normalizeSeedDate(options.today);

  database.sqlite.exec("begin");

  try {
    clearDemoTables(database);
    insertSetup(database);
    insertMeals(database, today);
    insertPreferences(database);
    insertLifeData(database, today);
    database.sqlite.exec("commit");
  } catch (error) {
    database.sqlite.exec("rollback");
    throw error;
  }

  return {
    coupleName: "两人小家",
    users: 2,
    meals: 2,
    preferences: 4,
    expenses: 2,
    parcels: 2,
    waterDrinks: 3,
    todos: 2,
    anniversaries: 1
  };
}
