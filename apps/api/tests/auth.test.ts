import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("serves parcel images without a custom token header", async () => {
    const parcelImageDir = mkdtempSync(join(tmpdir(), "couple-auth-images-"));
    const app = await buildApp({
      databaseUrl: ":memory:",
      apiToken: "dev-secret",
      parcelImageDir
    });

    try {
      const uploadResponse = await app.inject({
        method: "POST",
        url: "/api/parcels/images",
        headers: {
          "x-couple-api-token": "dev-secret"
        },
        payload: {
          mediaType: "image/png",
          dataBase64: Buffer.from("protected image").toString("base64")
        }
      });

      expect(uploadResponse.statusCode).toBe(201);

      const imageResponse = await app.inject({
        method: "GET",
        url: uploadResponse.json().image.imagePath
      });

      expect(imageResponse.statusCode).toBe(200);
      expect(imageResponse.body).toBe("protected image");
    } finally {
      await app.close();
      rmSync(parcelImageDir, { recursive: true, force: true });
    }
  });
});
