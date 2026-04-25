import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("meal routes", () => {
  it("creates and lists manual meal records", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/meals/manual",
        payload: {
          occurredOn: "2026-04-25",
          mealKind: "takeout",
          person: "both",
          vendorName: "麻辣烫店",
          items: ["麻辣烫"],
          amountCents: 4500,
          rating: 4,
          note: "微辣可以"
        }
      });

      expect(createResponse.statusCode).toBe(201);

      const listResponse = await app.inject({
        method: "GET",
        url: "/api/meals/recent"
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toMatchObject({
        meals: [
          {
            vendorName: "麻辣烫店",
            items: ["麻辣烫"]
          }
        ]
      });
    } finally {
      await app.close();
    }
  });

  it("parses and confirms meal memory", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const parseResponse = await app.inject({
        method: "POST",
        url: "/api/meals/memory/parse",
        payload: {
          text: "今天吃了麻辣烫，花了45，她觉得不错但不要太辣。",
          occurredOn: "2026-04-25",
          person: "partner"
        }
      });

      expect(parseResponse.statusCode).toBe(200);
      const parsed = parseResponse.json();
      expect(parsed.confirmationRequired).toBe(true);

      const confirmResponse = await app.inject({
        method: "POST",
        url: "/api/meals/memory/confirm",
        payload: parsed
      });

      expect(confirmResponse.statusCode).toBe(201);
      expect(confirmResponse.json()).toMatchObject({
        meal: {
          vendorName: "麻辣烫",
          amountCents: 4500
        },
        preferences: [
          {
            value: "不要太辣"
          },
          {
            value: "麻辣烫"
          }
        ]
      });
    } finally {
      await app.close();
    }
  });

  it("returns recommendations", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/meals/recommendations",
        payload: {
          weather: "cold",
          budget: "normal",
          maxRecentDays: 3
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().recommendations).toHaveLength(3);
      expect(response.json().rouletteCandidates.length).toBeGreaterThanOrEqual(3);
    } finally {
      await app.close();
    }
  });
});
