import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().default("file:./data/app.db"),
  API_TOKEN: z.string().default(""),
  LLM_PROVIDER: z.enum(["disabled", "openai-compatible", "ollama"]).default("disabled"),
  LLM_BASE_URL: z.string().default("https://api.openai.com/v1"),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default("gpt-4o-mini"),
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(60_000).default(15_000),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  WEATHER_PROVIDER: z.enum(["disabled", "open-meteo"]).default("open-meteo"),
  WEATHER_DEFAULT_CITY: z.string().default("南昌")
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}
