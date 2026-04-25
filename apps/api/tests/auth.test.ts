import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("API token authentication", () => {
  it("keeps API routes open when no token is configured", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:",
      apiToken: ""
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/setup/status"
      });

      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("keeps health routes open when a token is configured", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:",
      apiToken: "dev-secret"
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/health/ready"
      });

      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("rejects protected API routes without the configured token", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:",
      apiToken: "dev-secret"
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/setup/status"
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: "UNAUTHORIZED",
        message: "API token is required"
      });
    } finally {
      await app.close();
    }
  });

  it("accepts the token from x-couple-api-token", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:",
      apiToken: "dev-secret"
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/setup/status",
        headers: {
          "x-couple-api-token": "dev-secret"
        }
      });

      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("accepts the token from a bearer authorization header", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:",
      apiToken: "dev-secret"
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/setup/status",
        headers: {
          authorization: "Bearer dev-secret"
        }
      });

      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});
