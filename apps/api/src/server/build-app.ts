import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { getEnv, type AppEnv } from "../config/env.js";
import { openDatabase, type AppDatabase } from "../db/client.js";
import { runMigrations } from "../db/migrations.js";
import { createInjectedLlmStatus, createLlmClient, getLlmStatus, type LlmClient } from "../features/assistant/llm-client.js";
import type { AssistantStatus } from "@couple-life/shared";
import { registerBackupRoutes } from "../features/backup/backup-routes.js";
import { registerLifeRoutes, type LifeRouteOptions } from "../features/life/life-routes.js";
import { registerMealRoutes } from "../features/meals/meal-routes.js";
import { registerSetupRoutes } from "../features/setup/setup-routes.js";
import { createWeatherClient, type WeatherClient } from "../features/weather/weather-client.js";
import { registerAuthHook } from "./auth.js";
import { registerHealthRoutes } from "./health-routes.js";

export interface BuildAppOptions {
  env?: AppEnv;
  database?: AppDatabase;
  databaseUrl?: string;
  apiToken?: string | null;
  llmClient?: LlmClient | null;
  assistantStatus?: AssistantStatus;
  weatherClient?: WeatherClient | null;
  parcelImageDir?: string;
  logger?: boolean;
  runDatabaseMigrations?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? getEnv();
  const database =
    options.database ?? openDatabase(options.databaseUrl ?? env.DATABASE_URL);

  if (options.runDatabaseMigrations !== false) {
    runMigrations(database.sqlite);
  }

  const app = Fastify({
    logger: options.logger ?? env.NODE_ENV === "production",
    bodyLimit: 8 * 1024 * 1024
  });

  app.addHook("onClose", async () => {
    database.sqlite.close();
  });

  await app.register(cors, {
    origin: true
  });

  registerAuthHook(app, { apiToken: options.apiToken ?? env.API_TOKEN });

  await registerHealthRoutes(app, { database });
  await registerSetupRoutes(app, { database });
  await registerMealRoutes(app, { database });
  await registerBackupRoutes(app, { database });
  const weatherClient = options.weatherClient === undefined
    ? env.NODE_ENV === "test"
      ? null
      : createWeatherClient(env)
    : options.weatherClient;

  const llmClient = options.llmClient === undefined
    ? createLlmClient(env)
    : options.llmClient;
  const assistantStatus = options.assistantStatus
    ?? (options.llmClient === undefined ? getLlmStatus(env) : createInjectedLlmStatus());

  const lifeRouteOptions: LifeRouteOptions = {
    database,
    llmClient,
    assistantStatus,
    weatherClient
  };

  if (options.parcelImageDir !== undefined) {
    lifeRouteOptions.parcelImageDir = options.parcelImageDir;
  }

  await registerLifeRoutes(app, lifeRouteOptions);

  return app;
}
