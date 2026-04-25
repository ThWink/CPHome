import { runLocalAcceptance } from "./local-acceptance.js";

function getArgumentValue(name: string): string | undefined {
  const prefix = `${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length);
}

const baseUrl = getArgumentValue("--base-url") ?? process.env.LOCAL_API_BASE_URL ?? "http://127.0.0.1:3000";
const apiToken = getArgumentValue("--api-token") ?? process.env.API_TOKEN;
const today = getArgumentValue("--today") ?? new Date().toISOString().slice(0, 10);

const result = await runLocalAcceptance({
  baseUrl,
  today,
  ...(apiToken === undefined ? {} : { apiToken })
});

for (const check of result.checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`);
}

if (!result.ok) {
  process.exitCode = 1;
}
