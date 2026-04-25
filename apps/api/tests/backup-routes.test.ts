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

  it("imports a backup snapshot into a fresh local database", async () => {
    const sourceApp = await buildApp({ databaseUrl: ":memory:" });
    const targetApp = await buildApp({ databaseUrl: ":memory:" });

    try {
      await sourceApp.inject({
        method: "POST",
        url: "/api/expenses",
        payload: {
          occurredOn: "2026-04-25",
          category: "takeout",
          payer: "partner",
          amountCents: 6200,
          note: "夜宵"
        }
      });
      await sourceApp.inject({
        method: "POST",
        url: "/api/parcels",
        payload: {
          title: "顺丰快递",
          pickupCode: "B-2048",
          location: "小区门口",
          owner: "self",
          note: null
        }
      });

      await targetApp.inject({
        method: "POST",
        url: "/api/expenses",
        payload: {
          occurredOn: "2026-04-24",
          category: "daily",
          payer: "self",
          amountCents: 100,
          note: "will be replaced"
        }
      });

      const exportResponse = await sourceApp.inject({
        method: "GET",
        url: "/api/backup/export"
      });

      const importResponse = await targetApp.inject({
        method: "POST",
        url: "/api/backup/import",
        payload: {
          confirm: "RESTORE_LOCAL_DATA",
          backup: exportResponse.json().backup
        }
      });

      expect(importResponse.statusCode).toBe(200);
      expect(importResponse.json()).toMatchObject({
        imported: {
          version: 1,
          tableCounts: {
            expenses: 1,
            parcels: 1,
            life_events: 2
          }
        }
      });

      const expensesResponse = await targetApp.inject({
        method: "GET",
        url: "/api/expenses/recent"
      });
      const parcelsResponse = await targetApp.inject({
        method: "GET",
        url: "/api/parcels/pending"
      });

      expect(expensesResponse.json()).toMatchObject({
        expenses: [
          {
            category: "takeout",
            amountCents: 6200,
            note: "夜宵"
          }
        ]
      });
      expect(parcelsResponse.json()).toMatchObject({
        parcels: [
          {
            pickupCode: "B-2048",
            location: "小区门口"
          }
        ]
      });
    } finally {
      await sourceApp.close();
      await targetApp.close();
    }
  });
});
