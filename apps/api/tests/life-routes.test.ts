import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("life routes", () => {
  it("records water drinks and returns today's summary", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/water/drinks",
        payload: {
          person: "self",
          occurredOn: "2026-04-25",
          amountMl: 300
        }
      });

      expect(createResponse.statusCode).toBe(201);
      expect(createResponse.json()).toMatchObject({
        drink: {
          person: "self",
          occurredOn: "2026-04-25",
          amountMl: 300
        }
      });

      const summaryResponse = await app.inject({
        method: "GET",
        url: "/api/water/today?date=2026-04-25"
      });

      expect(summaryResponse.statusCode).toBe(200);
      expect(summaryResponse.json()).toEqual({
        water: {
          occurredOn: "2026-04-25",
          people: [
            {
              person: "self",
              drinkCount: 1,
              totalMl: 300
            },
            {
              person: "partner",
              drinkCount: 0,
              totalMl: 0
            }
          ]
        }
      });
    } finally {
      await app.close();
    }
  });

  it("creates pending parcels and updates their status", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/parcels",
        payload: {
          title: "京东快递",
          pickupCode: "A-1024",
          location: "楼下驿站",
          owner: "partner",
          note: "下班顺手拿"
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const parcel = createResponse.json().parcel;
      expect(parcel).toMatchObject({
        title: "京东快递",
        status: "pending"
      });

      const pendingResponse = await app.inject({
        method: "GET",
        url: "/api/parcels/pending"
      });
      expect(pendingResponse.json()).toMatchObject({
        parcels: [
          {
            id: parcel.id,
            pickupCode: "A-1024"
          }
        ]
      });

      const updateResponse = await app.inject({
        method: "PATCH",
        url: `/api/parcels/${parcel.id}/status`,
        payload: {
          status: "picked"
        }
      });

      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.json().parcel.status).toBe("picked");

      const nextPendingResponse = await app.inject({
        method: "GET",
        url: "/api/parcels/pending"
      });
      expect(nextPendingResponse.json()).toEqual({ parcels: [] });
    } finally {
      await app.close();
    }
  });

  it("records expenses and returns recent expenses", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const createResponse = await app.inject({
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

      expect(createResponse.statusCode).toBe(201);
      expect(createResponse.json()).toMatchObject({
        expense: {
          category: "takeout",
          amountCents: 4580,
          note: "晚饭外卖"
        }
      });

      const recentResponse = await app.inject({
        method: "GET",
        url: "/api/expenses/recent"
      });

      expect(recentResponse.statusCode).toBe(200);
      expect(recentResponse.json()).toMatchObject({
        expenses: [
          {
            category: "takeout",
            amountCents: 4580
          }
        ]
      });
    } finally {
      await app.close();
    }
  });

  it("returns monthly expense summary by category and payer", async () => {
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
          note: "dinner takeout"
        }
      });
      await app.inject({
        method: "POST",
        url: "/api/expenses",
        payload: {
          occurredOn: "2026-04-26",
          category: "groceries",
          payer: "partner",
          amountCents: 2600,
          note: "fruit"
        }
      });
      await app.inject({
        method: "POST",
        url: "/api/expenses",
        payload: {
          occurredOn: "2026-05-01",
          category: "takeout",
          payer: "both",
          amountCents: 1000,
          note: "next month"
        }
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/expenses/summary?month=2026-04"
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        summary: {
          month: "2026-04",
          totalCents: 7180,
          byCategory: [
            {
              category: "takeout",
              amountCents: 4580,
              count: 1
            },
            {
              category: "groceries",
              amountCents: 2600,
              count: 1
            }
          ],
          byPayer: [
            {
              payer: "self",
              amountCents: 4580,
              count: 1
            },
            {
              payer: "partner",
              amountCents: 2600,
              count: 1
            }
          ]
        }
      });
    } finally {
      await app.close();
    }
  });

  it("returns dashboard data for today", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      await app.inject({
        method: "POST",
        url: "/api/water/drinks",
        payload: {
          person: "partner",
          occurredOn: "2026-04-25",
          amountMl: 250
        }
      });
      await app.inject({
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
      await app.inject({
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

      const response = await app.inject({
        method: "GET",
        url: "/api/dashboard/today?date=2026-04-25"
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        dashboard: {
          date: "2026-04-25",
          water: {
            people: [
              {
                person: "self",
                drinkCount: 0,
                totalMl: 0
              },
              {
                person: "partner",
                drinkCount: 1,
                totalMl: 250
              }
            ]
          },
          pendingParcels: [
            {
              pickupCode: "B-2048"
            }
          ],
          recentExpense: {
            amountCents: 6200,
            note: "夜宵"
          }
        }
      });
    } finally {
      await app.close();
    }
  });
});
