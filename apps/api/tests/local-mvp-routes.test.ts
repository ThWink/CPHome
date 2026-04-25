import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("local MVP routes", () => {
  it("returns local weather advice", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/weather/today?city=南昌"
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        weather: {
          city: "南昌",
          condition: expect.any(String),
          temperatureC: expect.any(Number),
          advice: expect.any(String)
        }
      });
    } finally {
      await app.close();
    }
  });

  it("creates open todos and marks them done", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/todos",
        payload: {
          title: "记得拿快递",
          assignee: "both",
          dueOn: "2026-04-25"
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const todo = createResponse.json().todo;
      expect(todo).toMatchObject({
        title: "记得拿快递",
        status: "open"
      });

      const listResponse = await app.inject({
        method: "GET",
        url: "/api/todos/open"
      });
      expect(listResponse.json()).toMatchObject({
        todos: [
          {
            id: todo.id,
            title: "记得拿快递"
          }
        ]
      });

      const updateResponse = await app.inject({
        method: "PATCH",
        url: `/api/todos/${todo.id}/status`,
        payload: {
          status: "done"
        }
      });
      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.json().todo.status).toBe("done");
    } finally {
      await app.close();
    }
  });

  it("lists upcoming anniversaries", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/anniversaries",
        payload: {
          title: "在一起纪念日",
          date: "2026-05-20",
          repeat: "yearly",
          remindDaysBefore: 7
        }
      });

      expect(createResponse.statusCode).toBe(201);

      const listResponse = await app.inject({
        method: "GET",
        url: "/api/anniversaries/upcoming?date=2026-04-25"
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toMatchObject({
        anniversaries: [
          {
            title: "在一起纪念日",
            nextOn: "2026-05-20",
            daysLeft: 25
          }
        ]
      });
    } finally {
      await app.close();
    }
  });

  it("answers assistant dashboard questions from local data", async () => {
    const app = await buildApp({ databaseUrl: ":memory:" });

    try {
      await app.inject({
        method: "POST",
        url: "/api/parcels",
        payload: {
          title: "顺丰快递",
          pickupCode: "B-2048",
          location: "小区门口",
          owner: "both",
          note: null
        }
      });
      await app.inject({
        method: "POST",
        url: "/api/todos",
        payload: {
          title: "买牛奶",
          assignee: "self",
          dueOn: "2026-04-25"
        }
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/assistant/chat",
        payload: {
          message: "今天有什么事",
          date: "2026-04-25"
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().reply).toContain("待取快递 1 个");
      expect(response.json().reply).toContain("待办 1 个");
      expect(response.json().reply).not.toContain("：，");
    } finally {
      await app.close();
    }
  });
});
