import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { getEnv, type AppEnv } from "../config/env.js";
import { registerHealthRoutes } from "./health-routes.js";

export interface BuildAppOptions {
  env?: AppEnv;
  databaseUrl?: string;
  logger?: boolean;
  runDatabaseMigrations?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? getEnv();
  const app = Fastify({
    logger: options.logger ?? env.NODE_ENV === "production"
  });

  await app.register(cors, {
    origin: true
  });

  await registerHealthRoutes(app);

  return app;
}
