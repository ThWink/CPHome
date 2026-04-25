import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../../db/client.js";
import {
  createExpense,
  createParcel,
  createWaterDrink,
  getDashboardToday,
  getWaterTodaySummary,
  listPendingParcels,
  listRecentExpenses,
  normalizeLocalDate,
  updateParcelStatus
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
  const record = typeof params === "object" && params !== null
    ? params as Record<string, unknown>
    : {};

  if (typeof record.id !== "string" || record.id.trim().length === 0) {
    throw new Error("parcel id is required");
  }

  return record.id;
}

export async function registerLifeRoutes(
  app: FastifyInstance,
  options: LifeRouteOptions
): Promise<void> {
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
}
