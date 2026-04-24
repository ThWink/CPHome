import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../../db/client.js";
import {
  getSetupStatus,
  initializeCouple,
  SetupAlreadyCompletedError
} from "./setup-service.js";

export interface SetupRouteOptions {
  database: AppDatabase;
}

export async function registerSetupRoutes(
  app: FastifyInstance,
  options: SetupRouteOptions
): Promise<void> {
  app.get("/api/setup/status", async () => getSetupStatus(options.database));

  app.post("/api/setup/initialize", async (request, reply) => {
    try {
      const result = initializeCouple(options.database, request.body);
      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof SetupAlreadyCompletedError) {
        return reply.code(409).send({
          error: "SETUP_ALREADY_COMPLETED",
          message: error.message
        });
      }

      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_SETUP_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });
}
