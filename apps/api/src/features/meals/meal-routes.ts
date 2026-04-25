import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../../db/client.js";
import { parseMealMemoryText } from "./meal-memory-parser.js";
import { recommendMeals } from "./meal-recommendation-service.js";
import {
  createMealMemory,
  createMealRecord,
  listRecentMealRecords,
  listTastePreferences,
  upsertTastePreference
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
      const meal = createMealRecord(options.database, parsed.mealRecord);
      const preferences = parsed.preferenceUpdates.map((preference) =>
        upsertTastePreference(options.database, preference)
      );

      createMealMemory(options.database, meal.id, parsed.memoryText);

      return reply.code(201).send({
        meal,
        preferences,
        memoryText: parsed.memoryText
      });
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
