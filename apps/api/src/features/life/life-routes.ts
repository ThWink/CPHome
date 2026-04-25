import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../../db/client.js";
import {
  createAnniversary,
  createExpense,
  createParcel,
  createTodo,
  createWaterDrink,
  getDashboardToday,
  getWeatherToday,
  getWaterTodaySummary,
  listOpenTodos,
  listUpcomingAnniversaries,
  listPendingParcels,
  listRecentExpenses,
  normalizeLocalDate,
  updateParcelStatus,
  updateTodoStatus
} from "./life-repository.js";

export interface LifeRouteOptions {
  database: AppDatabase;
}

function getQueryDate(query: unknown): string {
  const record = typeof query === "object" && query !== null
    ? query as Record<string, unknown>
    : {};

  return normalizeLocalDate(record.date);
}

function getParcelId(params: unknown): string {
  return getRequiredId(params, "parcel id");
}

function getTodoId(params: unknown): string {
  return getRequiredId(params, "todo id");
}

function getRequiredId(params: unknown, label: string): string {
  const record = typeof params === "object" && params !== null
    ? params as Record<string, unknown>
    : {};

  if (typeof record.id !== "string" || record.id.trim().length === 0) {
    throw new Error(`${label} is required`);
  }

  return record.id;
}

function getQueryString(query: unknown, fieldName: string): unknown {
  const record = typeof query === "object" && query !== null
    ? query as Record<string, unknown>
    : {};

  return record[fieldName];
}

function getBodyDate(body: unknown): string {
  const record = typeof body === "object" && body !== null
    ? body as Record<string, unknown>
    : {};

  return normalizeLocalDate(record.date);
}

export async function registerLifeRoutes(
  app: FastifyInstance,
  options: LifeRouteOptions
): Promise<void> {
  app.get("/api/weather/today", async (request) => ({
    weather: getWeatherToday(getQueryString(request.query, "city"))
  }));

  app.post("/api/water/drinks", async (request, reply) => {
    try {
      const drink = createWaterDrink(options.database, request.body);
      return reply.code(201).send({ drink });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_WATER_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/water/today", async (request, reply) => {
    try {
      const date = getQueryDate(request.query);
      return { water: getWaterTodaySummary(options.database, date) };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_WATER_QUERY",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/parcels", async (request, reply) => {
    try {
      const parcel = createParcel(options.database, request.body);
      return reply.code(201).send({ parcel });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_PARCEL_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/parcels/pending", async () => ({
    parcels: listPendingParcels(options.database)
  }));

  app.patch("/api/parcels/:id/status", async (request, reply) => {
    try {
      const id = getParcelId(request.params);
      const parcel = updateParcelStatus(options.database, id, request.body);
      return { parcel };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(error.message === "parcel not found" ? 404 : 400).send({
          error: error.message === "parcel not found" ? "PARCEL_NOT_FOUND" : "INVALID_PARCEL_STATUS",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/expenses", async (request, reply) => {
    try {
      const expense = createExpense(options.database, request.body);
      return reply.code(201).send({ expense });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_EXPENSE_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/expenses/recent", async () => ({
    expenses: listRecentExpenses(options.database, 20)
  }));

  app.post("/api/todos", async (request, reply) => {
    try {
      const todo = createTodo(options.database, request.body);
      return reply.code(201).send({ todo });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_TODO_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/todos/open", async () => ({
    todos: listOpenTodos(options.database)
  }));

  app.patch("/api/todos/:id/status", async (request, reply) => {
    try {
      const id = getTodoId(request.params);
      const todo = updateTodoStatus(options.database, id, request.body);
      return { todo };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(error.message === "todo not found" ? 404 : 400).send({
          error: error.message === "todo not found" ? "TODO_NOT_FOUND" : "INVALID_TODO_STATUS",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/anniversaries", async (request, reply) => {
    try {
      const anniversary = createAnniversary(options.database, request.body);
      return reply.code(201).send({ anniversary });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_ANNIVERSARY_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/anniversaries/upcoming", async (request, reply) => {
    try {
      const date = getQueryDate(request.query);
      return {
        anniversaries: listUpcomingAnniversaries(options.database, date)
      };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_ANNIVERSARY_QUERY",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/dashboard/today", async (request, reply) => {
    try {
      const date = getQueryDate(request.query);
      return { dashboard: getDashboardToday(options.database, date) };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_DASHBOARD_QUERY",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/assistant/chat", async (request, reply) => {
    try {
      const date = getBodyDate(request.body);
      const dashboard = getDashboardToday(options.database, date);
      const summaryParts = [
        `待取快递 ${dashboard.pendingParcels.length} 个`,
        `待办 ${dashboard.openTodos.length} 个`,
        `纪念日提醒 ${dashboard.upcomingAnniversaries.length} 个`,
        `喝水记录 ${dashboard.water.people.reduce((sum, item) => sum + item.drinkCount, 0)} 次`
      ];

      return {
        reply: `${date} 今天有：${summaryParts.join("，")}`,
        dashboard
      };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_ASSISTANT_REQUEST",
          message: error.message
        });
      }

      throw error;
    }
  });
}
