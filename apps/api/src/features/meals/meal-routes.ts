import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../../db/client.js";
import { parseMealMemoryText } from "./meal-memory-parser.js";
import { recommendMeals } from "./meal-recommendation-service.js";
import {
  createMealRecord,
  createMealRequest,
  deleteMealMemory,
  listMealMemories,
  listPendingMealRequests,
  listRecentMealRecords,
  listTastePreferences,
  saveConfirmedMealMemory,
  updateMealMemory,
  updateMealRequestStatus
} from "./meal-repository.js";

export interface MealRouteOptions {
  database: AppDatabase;
}

interface ConfirmMealMemoryPayload {
  mealRecord?: unknown;
  preferenceUpdates?: unknown;
  memoryText?: unknown;
}

interface NormalizedConfirmMealMemoryPayload {
  mealRecord: unknown;
  preferenceUpdates: unknown[];
  memoryText: string;
}

function getRouteId(params: unknown, errorName: string): string {
  const record = typeof params === "object" && params !== null
    ? params as { id?: unknown }
    : {};
  const id = typeof record.id === "string" ? record.id.trim() : "";

  if (!id) {
    throw new Error(errorName);
  }

  return id;
}

function getMemoryContent(body: unknown): unknown {
  const record = typeof body === "object" && body !== null
    ? body as { content?: unknown }
    : {};

  return record.content;
}

function normalizeConfirmPayload(input: unknown): NormalizedConfirmMealMemoryPayload {
  if (typeof input !== "object" || input === null) {
    throw new Error("confirmation payload must be an object");
  }

  const payload = input as ConfirmMealMemoryPayload;
  if (!Array.isArray(payload.preferenceUpdates)) {
    throw new Error("preferenceUpdates must be an array");
  }

  if (typeof payload.memoryText !== "string") {
    throw new Error("memoryText is required");
  }

  return {
    mealRecord: payload.mealRecord,
    preferenceUpdates: payload.preferenceUpdates,
    memoryText: payload.memoryText
  };
}

export async function registerMealRoutes(
  app: FastifyInstance,
  options: MealRouteOptions
): Promise<void> {
  app.post("/api/meals/requests", async (request, reply) => {
    try {
      const mealRequest = createMealRequest(options.database, request.body);
      return reply.code(201).send({ request: mealRequest });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_MEAL_REQUEST_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/meals/requests/pending", async () => ({
    requests: listPendingMealRequests(options.database)
  }));

  app.patch("/api/meals/requests/:id/status", async (request, reply) => {
    const params = request.params as { id?: string };
    const id = params.id?.trim();
    if (!id) {
      return reply.code(400).send({
        error: "INVALID_MEAL_REQUEST_ID",
        message: "meal request id is required"
      });
    }

    try {
      const mealRequest = updateMealRequestStatus(options.database, id, request.body);
      return { request: mealRequest };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(error.message === "meal request not found" ? 404 : 400).send({
          error: error.message === "meal request not found"
            ? "MEAL_REQUEST_NOT_FOUND"
            : "INVALID_MEAL_REQUEST_STATUS",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/meals/recent", async () => ({
    meals: listRecentMealRecords(options.database, 20)
  }));

  app.post("/api/meals/manual", async (request, reply) => {
    try {
      const meal = createMealRecord(options.database, request.body);
      return reply.code(201).send({ meal });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_MEAL_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/meals/preferences", async () => ({
    preferences: listTastePreferences(options.database)
  }));

  app.get("/api/meals/memories", async () => ({
    memories: listMealMemories(options.database, 50)
  }));

  app.patch("/api/meals/memories/:id", async (request, reply) => {
    try {
      const id = getRouteId(request.params, "meal memory id is required");
      const memory = updateMealMemory(options.database, id, getMemoryContent(request.body));
      return { memory };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(error.message === "meal memory not found" ? 404 : 400).send({
          error: error.message === "meal memory not found" ? "MEMORY_NOT_FOUND" : "INVALID_MEMORY_CONTENT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.delete("/api/meals/memories/:id", async (request, reply) => {
    let id = "";
    try {
      id = getRouteId(request.params, "meal memory id is required");
    } catch {
      return reply.code(400).send({
        error: "INVALID_MEMORY_ID",
        message: "memory id is required"
      });
    }

    const deleted = deleteMealMemory(options.database, id);
    if (!deleted) {
      return reply.code(404).send({
        error: "MEMORY_NOT_FOUND",
        message: "meal memory not found"
      });
    }

    return reply.code(204).send();
  });

  app.post("/api/meals/memory/parse", async (request, reply) => {
    try {
      return parseMealMemoryText(request.body);
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_MEMORY_TEXT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/meals/memory/confirm", async (request, reply) => {
    try {
      const parsed = normalizeConfirmPayload(request.body);
      const result = saveConfirmedMealMemory(
        options.database,
        parsed.mealRecord,
        parsed.preferenceUpdates,
        parsed.memoryText
      );

      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_MEMORY_CONFIRMATION",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/meals/recommendations", async (request, reply) => {
    try {
      return recommendMeals(options.database, request.body ?? {});
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_RECOMMENDATION_REQUEST",
          message: error.message
        });
      }

      throw error;
    }
  });
}
