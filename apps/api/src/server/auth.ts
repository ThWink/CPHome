import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AuthOptions {
  apiToken: string | null | undefined;
}

function normalizeToken(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

function getRequestToken(request: FastifyRequest): string {
  const headerToken = normalizeToken(request.headers["x-couple-api-token"]);
  if (headerToken.length > 0) {
    return headerToken;
  }

  const authorization = normalizeToken(request.headers.authorization);
  const bearerPrefix = "Bearer ";
  if (authorization.startsWith(bearerPrefix)) {
    return authorization.slice(bearerPrefix.length).trim();
  }

  return "";
}

function tokensMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function isProtectedPath(url: string): boolean {
  return url === "/api" || url.startsWith("/api/");
}

function isPublicParcelImageRequest(request: FastifyRequest): boolean {
  const path = request.url.split("?")[0] ?? request.url;
  return request.method === "GET" && path.startsWith("/api/parcels/images/");
}

export function registerAuthHook(app: FastifyInstance, options: AuthOptions): void {
  const apiToken = options.apiToken?.trim() ?? "";
  if (apiToken.length === 0) {
    return;
  }

  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isProtectedPath(request.url) || isPublicParcelImageRequest(request)) {
      return;
    }

    if (tokensMatch(getRequestToken(request), apiToken)) {
      return;
    }

    await reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "API token is required"
    });
  });
}
