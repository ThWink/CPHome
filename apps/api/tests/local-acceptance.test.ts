import { describe, expect, it } from "vitest";
import { runLocalAcceptance } from "../src/dev/local-acceptance.js";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

describe("local acceptance verifier", () => {
  it("checks the local V1 API walkthrough and sends the configured token", async () => {
    const requests: Array<{ url: string; headers: Record<string, string> }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      const url = input.toString();
      const headers = Object.fromEntries(new Headers(init?.headers).entries());
      requests.push({ url, headers });

      if (url.endsWith("/health/ready")) {
        return jsonResponse({ status: "ok", checks: { database: "ok" } });
      }

      if (url.endsWith("/api/setup/status")) {
        return jsonResponse({ configured: true, coupleName: "两人小家", memberCount: 2 });
      }

      if (url.includes("/api/dashboard/today")) {
        return jsonResponse({
          dashboard: {
            weather: { condition: "多云" },
            pendingParcels: [{ id: "p1" }],
            openTodos: [{ id: "t1" }],
            upcomingAnniversaries: [{ id: "a1" }]
          }
        });
      }

      if (url.endsWith("/api/meals/recommendations")) {
        return jsonResponse({
          recommendations: [{ title: "番茄牛腩饭" }, { title: "砂锅粥" }, { title: "小碗菜" }],
          rouletteCandidates: [{ title: "番茄牛腩饭" }]
        });
      }

      if (url.endsWith("/api/meals/memories")) {
        return jsonResponse({ memories: [{ id: "m1", content: "少辣" }] });
      }

      if (url.endsWith("/api/assistant/chat")) {
        return jsonResponse({ reply: "今天有待办和快递", source: "local" });
      }

      return jsonResponse({ error: "not found" }, 404);
    };

    const result = await runLocalAcceptance({
      baseUrl: "http://127.0.0.1:3000/",
      apiToken: "local-token",
      today: "2026-04-25",
      fetcher
    });

    expect(result.ok).toBe(true);
    expect(result.checks.map((check) => check.name)).toEqual([
      "health",
      "setup",
      "dashboard",
      "meal recommendations",
      "meal memories",
      "assistant"
    ]);
    expect(requests.every((request) => request.url.startsWith("http://127.0.0.1:3000/"))).toBe(true);
    expect(requests.find((request) => request.url.endsWith("/api/setup/status"))?.headers).toMatchObject({
      "x-couple-api-token": "local-token"
    });
  });

  it("returns a failed check when an endpoint is not healthy", async () => {
    const result = await runLocalAcceptance({
      baseUrl: "http://127.0.0.1:3000",
      today: "2026-04-25",
      fetcher: async () => jsonResponse({ error: "down" }, 500)
    });

    expect(result.ok).toBe(false);
    expect(result.checks[0]).toMatchObject({
      name: "health",
      ok: false
    });
    expect(result.checks).toHaveLength(1);
  });
});
