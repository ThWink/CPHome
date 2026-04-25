import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("meal routes", () => {
  it("creates pending meal requests and marks them planned", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/meals/requests",
        payload: {
          requester: "partner",
          target: "self",
          title: "番茄牛腩饭",
          vendorName: "楼下盖饭",
          note: "今晚想吃这个，不要太辣"
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const request = createResponse.json().request;
      expect(request).toMatchObject({
        requester: "partner",
        target: "self",
        title: "番茄牛腩饭",
        vendorName: "楼下盖饭",
        note: "今晚想吃这个，不要太辣",
        status: "pending"
      });

      const pendingResponse = await app.inject({
        method: "GET",
        url: "/api/meals/requests/pending"
      });

      expect(pendingResponse.statusCode).toBe(200);
      expect(pendingResponse.json()).toMatchObject({
        requests: [
          {
            id: request.id,
            title: "番茄牛腩饭",
            status: "pending"
          }
        ]
      });

      const updateResponse = await app.inject({
        method: "PATCH",
        url: `/api/meals/requests/${request.id}/status`,
        payload: {
          status: "planned"
        }
      });

      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.json().request.status).toBe("planned");

      const nextPendingResponse = await app.inject({
        method: "GET",
        url: "/api/meals/requests/pending"
      });
      expect(nextPendingResponse.json()).toEqual({ requests: [] });
    } finally {
      await app.close();
    }
  });

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

  it("lists and deletes confirmed meal memories", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const confirmResponse = await app.inject({
        method: "POST",
        url: "/api/meals/memory/confirm",
        payload: {
          mealRecord: {
            occurredOn: "2026-04-25",
            mealKind: "takeout",
            person: "both",
            vendorName: "砂锅粥铺",
            items: ["皮蛋瘦肉粥"],
            amountCents: 3600,
            rating: 5,
            note: "清淡热乎"
          },
          preferenceUpdates: [
            {
              person: "partner",
              category: "dish",
              value: "砂锅粥",
              sentiment: "like",
              weight: 50,
              note: "清淡晚餐备用"
            }
          ],
          memoryText: "她想吃清淡热乎的时候，砂锅粥铺是稳定选择。"
        }
      });
      expect(confirmResponse.statusCode).toBe(201);

      const listResponse = await app.inject({
        method: "GET",
        url: "/api/meals/memories"
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toMatchObject({
        memories: [
          {
            id: expect.any(String),
            content: "她想吃清淡热乎的时候，砂锅粥铺是稳定选择。",
            meal: {
              vendorName: "砂锅粥铺",
              items: ["皮蛋瘦肉粥"]
            }
          }
        ]
      });

      const memoryId = listResponse.json().memories[0].id;
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/api/meals/memories/${memoryId}`
      });
      expect(deleteResponse.statusCode).toBe(204);

      const nextListResponse = await app.inject({
        method: "GET",
        url: "/api/meals/memories"
      });
      const recentMealsResponse = await app.inject({
        method: "GET",
        url: "/api/meals/recent"
      });

      expect(nextListResponse.json()).toEqual({ memories: [] });
      expect(recentMealsResponse.json().meals).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it("does not persist partial data when memory confirmation is invalid", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/meals/memory/confirm",
        payload: {
          mealRecord: {
            occurredOn: "2026-04-25",
            mealKind: "takeout",
            person: "both",
            vendorName: "麻辣烫",
            items: ["麻辣烫"],
            amountCents: 4500,
            rating: 4,
            note: "微辣可以"
          },
          preferenceUpdates: [
            {
              person: "both",
              category: "dish",
              value: "麻辣烫",
              sentiment: "like",
              weight: 30,
              note: "微辣可以"
            }
          ],
          memoryText: "   "
        }
      });

      expect(response.statusCode).toBe(400);

      const recentResponse = await app.inject({
        method: "GET",
        url: "/api/meals/recent"
      });
      const preferencesResponse = await app.inject({
        method: "GET",
        url: "/api/meals/preferences"
      });

      expect(recentResponse.json()).toEqual({ meals: [] });
      expect(preferencesResponse.json()).toEqual({ preferences: [] });
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

  it("confirms parsed long memory without parse-confirm mismatch", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const parseResponse = await app.inject({
        method: "POST",
        url: "/api/meals/memory/parse",
        payload: {
          text: "今天吃了麻辣烫，花了45，她觉得不错但不要太辣，备注非常长因为想记录口味细节配送速度包装汤底咸淡蔬菜分量下次是否还点以及其它补充说明，还想记录她对辣度油度盐度温度和第二天是否还愿意复购的详细反馈。",
          occurredOn: "2026-04-25",
          person: "partner"
        }
      });

      expect(parseResponse.statusCode).toBe(200);

      const confirmResponse = await app.inject({
        method: "POST",
        url: "/api/meals/memory/confirm",
        payload: parseResponse.json()
      });

      expect(confirmResponse.statusCode).toBe(201);
    } finally {
      await app.close();
    }
  });

  it("confirms parsed long dish names without parse-confirm mismatch", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const parseResponse = await app.inject({
        method: "POST",
        url: "/api/meals/memory/parse",
        payload: {
          text: "今天吃了超长菜名套餐包含麻辣烫炸鸡汉堡寿司拼盘黄焖鸡米饭粥和小菜日式便当热汤冷食蔬菜甜品饮料水果拼盘双人套餐加备注超长菜名套餐包含麻辣烫炸鸡汉堡寿司拼盘黄焖鸡米饭粥和小菜，花了88，挺好吃。",
          occurredOn: "2026-04-25",
          person: "both"
        }
      });

      expect(parseResponse.statusCode).toBe(200);

      const confirmResponse = await app.inject({
        method: "POST",
        url: "/api/meals/memory/confirm",
        payload: parseResponse.json()
      });

      expect(confirmResponse.statusCode).toBe(201);
    } finally {
      await app.close();
    }
  });
});
