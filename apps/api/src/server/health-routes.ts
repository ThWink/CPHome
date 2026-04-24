import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../db/client.js";

export interface HealthRouteOptions {
  database: AppDatabase;
}

export async function registerHealthRoutes(
  app: FastifyInstance,
  options: HealthRouteOptions
): Promise<void> {
  app.get("/health/live", async () => ({
    status: "ok",
    service: "couple-life-api"
  }));

  app.get("/health/ready", async () => {
    options.database.sqlite.prepare("select 1 as ok").get();

    return {
      status: "ok",
      checks: {
        database: "ok"
      }
    };
  });
}
