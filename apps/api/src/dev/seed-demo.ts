import { getEnv } from "../config/env.js";
import { openDatabase } from "../db/client.js";
import { runMigrations } from "../db/migrations.js";
import { seedDemoData } from "./demo-data.js";

function getArgumentValue(name: string): string | undefined {
  const prefix = `${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length);
}

const env = getEnv();
const force = process.argv.includes("--force");

if (env.NODE_ENV === "production" && !force) {
  throw new Error("Refusing to seed demo data in production without --force");
}

const databaseUrl = getArgumentValue("--database-url") ?? env.DATABASE_URL;
const today = getArgumentValue("--today");
const database = openDatabase(databaseUrl);

try {
  runMigrations(database.sqlite);
  const result = seedDemoData(database, today === undefined ? {} : { today });
  console.log(JSON.stringify(result, null, 2));
} finally {
  database.sqlite.close();
}
