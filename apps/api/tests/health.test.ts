import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("health routes", () => {
  it("returns live status", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:",
      runDatabaseMigrations: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/health/live"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "couple-life-api"
    });

    await app.close();
  });

  it("returns ready status after database migration", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:"
    });

    const response = await app.inject({
      method: "GET",
      url: "/health/ready"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      checks: {
        database: "ok"
      }
    });

    await app.close();
  });
});
