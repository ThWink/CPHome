import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("setup API", () => {
  it("starts as unconfigured", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:"
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/setup/status"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      configured: false,
      coupleName: null,
      memberCount: 0
    });

    await app.close();
  });

  it("initializes exactly one couple", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:"
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/initialize",
      payload: {
        coupleName: "Our Home",
        selfName: "Wink",
        partnerName: "Partner"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      coupleId: expect.any(String),
      selfUserId: expect.any(String),
      partnerUserId: expect.any(String),
      inviteCode: expect.stringMatching(/^[A-Z0-9]{8}$/)
    });

    const statusResponse = await app.inject({
      method: "GET",
      url: "/api/setup/status"
    });

    expect(statusResponse.json()).toEqual({
      configured: true,
      coupleName: "Our Home",
      memberCount: 2
    });

    await app.close();
  });

  it("rejects a second initialization", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:"
    });

    await app.inject({
      method: "POST",
      url: "/api/setup/initialize",
      payload: {
        coupleName: "Our Home",
        selfName: "Wink",
        partnerName: "Partner"
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/initialize",
      payload: {
        coupleName: "Another Home",
        selfName: "A",
        partnerName: "B"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "SETUP_ALREADY_COMPLETED",
      message: "This deployment is already bound to one couple"
    });

    await app.close();
  });
});
