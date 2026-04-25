import { describe, expect, it } from "vitest";
import { openDatabase } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrations.js";
import { getDashboardToday } from "../src/features/life/life-repository.js";
import {
  listRecentMealRecords,
  listTastePreferences
} from "../src/features/meals/meal-repository.js";
import { getSetupStatus } from "../src/features/setup/setup-service.js";
import { seedDemoData } from "../src/dev/demo-data.js";

describe("demo data seeding", () => {
  it("replaces existing local data with readable Chinese demo data", () => {
    const database = openDatabase(":memory:");

    try {
      runMigrations(database.sqlite);
      database.sqlite
        .prepare(
          "insert into parcels (id, title, pickup_code, location, owner, status, note) values (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("legacy-parcel", "??????", "X-000", "????", "both", "pending", "legacy");

      const result = seedDemoData(database, { today: "2026-04-25" });

      expect(result).toEqual({
        coupleName: "两人小家",
        users: 2,
        meals: 2,
        preferences: 4,
        expenses: 2,
        parcels: 2,
        waterDrinks: 3,
        todos: 2,
        anniversaries: 1
      });
      expect(getSetupStatus(database)).toMatchObject({
        configured: true,
        coupleName: "两人小家",
        memberCount: 2
      });

      const dashboard = getDashboardToday(database, "2026-04-25");
      expect(dashboard.pendingParcels.map((parcel) => parcel.title)).toEqual(
        expect.arrayContaining(["顺丰快递", "京东快递"])
      );
      expect(dashboard.openTodos.map((todo) => todo.title)).toEqual(
        expect.arrayContaining(["取快递顺手买酸奶", "晚上决定外卖"])
      );
      expect(dashboard.recentExpense?.note).toBe("晚餐外卖");
      expect(dashboard.upcomingAnniversaries[0]?.title).toBe("在一起纪念日");
      expect(JSON.stringify(dashboard)).not.toContain("????");

      const meals = listRecentMealRecords(database, 10);
      expect(meals.map((meal) => meal.vendorName)).toEqual(
        expect.arrayContaining(["小碗菜馆", "砂锅粥铺"])
      );
      expect(listTastePreferences(database).map((preference) => preference.value)).toEqual(
        expect.arrayContaining(["少辣", "热汤", "油腻炸物", "砂锅粥"])
      );
    } finally {
      database.sqlite.close();
    }
  });

  it("can be rerun without duplicating demo rows", () => {
    const database = openDatabase(":memory:");

    try {
      runMigrations(database.sqlite);

      seedDemoData(database, { today: "2026-04-25" });
      seedDemoData(database, { today: "2026-04-25" });

      expect(database.sqlite.prepare("select count(*) as count from parcels").get()).toEqual({
        count: 2
      });
      expect(database.sqlite.prepare("select count(*) as count from meal_records").get()).toEqual({
        count: 2
      });
      expect(database.sqlite.prepare("select count(*) as count from taste_preferences").get()).toEqual({
        count: 4
      });
      expect(database.sqlite.prepare("select count(*) as count from users").get()).toEqual({
        count: 2
      });
    } finally {
      database.sqlite.close();
    }
  });
});
