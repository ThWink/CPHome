import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("backup routes", () => {
  it("exports local data tables as a portable JSON snapshot", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      await app.inject({
        method: "POST",
        url: "/api/expenses",
        payload: {
          occurredOn: "2026-04-25",
          category: "takeout",
          payer: "self",
          amountCents: 4580,
          note: "晚饭外卖"
        }
      });

      await app.inject({
        method: "POST",
        url: "/api/meals/requests",
        payload: {
          requester: "partner",
          target: "self",
          title: "番茄牛腩饭",
          vendorName: "楼下盖饭",
          note: "今晚想吃"
        }
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/backup/export"
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("application/json");
      expect(response.json()).toMatchObject({
        backup: {
          version: 1,
          tables: {
            expenses: [
              {
                category: "takeout",
                amount_cents: 4580,
                note: "晚饭外卖"
              }
            ],
            meal_requests: [
              {
                title: "番茄牛腩饭",
                vendor_name: "楼下盖饭",
                status: "pending"
              }
            ]
          },
          tableCounts: {
            expenses: 1,
            meal_requests: 1,
            life_events: 2
          }
        }
      });
      expect(typeof response.json().backup.exportedAt).toBe("string");
    } finally {
      await app.close();
    }
  });
});
