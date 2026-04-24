import { getEnv } from "./config/env.js";
import { buildApp } from "./server/build-app.js";

const env = getEnv();
const app = await buildApp({
  env,
  logger: true
});

try {
  await app.listen({
    host: env.HOST,
    port: env.PORT
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
