export interface LocalAcceptanceOptions {
  baseUrl: string;
  apiToken?: string;
  today: string;
  fetcher?: typeof fetch;
}

export interface LocalAcceptanceCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface LocalAcceptanceResult {
  ok: boolean;
  checks: LocalAcceptanceCheck[];
}

interface DashboardResponse {
  dashboard?: {
    weather?: unknown;
    pendingWaterReminders?: unknown[];
    pendingParcels?: unknown[];
    openTodos?: unknown[];
    upcomingAnniversaries?: unknown[];
  };
}

interface WeatherResponse {
  weather?: {
    city?: unknown;
    condition?: unknown;
    temperatureC?: unknown;
  };
}

interface WaterReminderResponse {
  reminder?: {
    id?: unknown;
    status?: unknown;
  };
}

interface RecommendationsResponse {
  recommendations?: unknown[];
  rouletteCandidates?: unknown[];
}

interface MemoriesResponse {
  memories?: unknown[];
}

interface MealRequestResponse {
  request?: {
    id?: unknown;
    status?: unknown;
  };
}

interface ExpenseSummaryResponse {
  summary?: {
    totalCents?: unknown;
    byCategory?: unknown[];
    byPayer?: unknown[];
  };
}

interface AssistantResponse {
  reply?: unknown;
  source?: unknown;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("baseUrl is required");
  }

  return trimmed.replace(/\/+$/, "");
}

async function readJson<T>(
  path: string,
  options: LocalAcceptanceOptions,
  request: { method?: string; body?: unknown } = {}
): Promise<{ status: number; body: T }> {
  const fetcher = options.fetcher ?? fetch;
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  const token = options.apiToken?.trim() ?? "";

  if (token.length > 0) {
    headers["x-couple-api-token"] = token;
  }

  const init: RequestInit = {
    method: request.method ?? "GET",
    headers
  };

  if (request.body !== undefined) {
    init.body = JSON.stringify(request.body);
  }

  const response = await fetcher(`${normalizeBaseUrl(options.baseUrl)}${path}`, init);

  const body = await response.json() as T;
  return {
    status: response.status,
    body
  };
}

function pass(name: string, detail: string): LocalAcceptanceCheck {
  return {
    name,
    ok: true,
    detail
  };
}

function fail(name: string, detail: string): LocalAcceptanceCheck {
  return {
    name,
    ok: false,
    detail
  };
}

function finish(checks: LocalAcceptanceCheck[]): LocalAcceptanceResult {
  return {
    ok: checks.every((check) => check.ok),
    checks
  };
}

async function appendCheck(
  checks: LocalAcceptanceCheck[],
  check: () => Promise<LocalAcceptanceCheck>
): Promise<boolean> {
  const result = await check();
  checks.push(result);
  return result.ok;
}

export async function runLocalAcceptance(
  options: LocalAcceptanceOptions
): Promise<LocalAcceptanceResult> {
  const checks: LocalAcceptanceCheck[] = [];

  if (!await appendCheck(checks, async () => {
    const response = await readJson<{ status?: string; checks?: { database?: string } }>(
      "/health/ready",
      options
    );

    return response.status === 200 &&
      response.body.status === "ok" &&
      response.body.checks?.database === "ok"
      ? pass("health", "API and database are ready")
      : fail("health", `expected ready health, got HTTP ${response.status}`);
  })) {
    return finish(checks);
  }

  if (!await appendCheck(checks, async () => {
    const response = await readJson<{ configured?: boolean; coupleName?: string; memberCount?: number }>(
      "/api/setup/status",
      options
    );

    return response.status === 200 && response.body.configured === true && (response.body.memberCount ?? 0) >= 2
      ? pass("setup", `configured for ${response.body.coupleName ?? "one couple"}`)
      : fail("setup", `deployment is not initialized, got HTTP ${response.status}`);
  })) {
    return finish(checks);
  }

  if (!await appendCheck(checks, async () => {
    const response = await readJson<DashboardResponse>(
      `/api/dashboard/today?date=${encodeURIComponent(options.today)}`,
      options
    );
    const dashboard = response.body.dashboard;

    return response.status === 200 &&
      dashboard?.weather !== undefined &&
      Array.isArray(dashboard.pendingWaterReminders) &&
      Array.isArray(dashboard.pendingParcels) &&
      Array.isArray(dashboard.openTodos) &&
      Array.isArray(dashboard.upcomingAnniversaries)
      ? pass("dashboard", "home dashboard data is available")
      : fail("dashboard", `dashboard data is incomplete, got HTTP ${response.status}`);
  })) {
    return finish(checks);
  }

  if (!await appendCheck(checks, async () => {
    const response = await readJson<WeatherResponse>(
      "/api/weather/today?city=%E5%8D%97%E6%98%8C",
      options
    );
    const weather = response.body.weather;

    return response.status === 200 &&
      weather !== undefined &&
      typeof weather.city === "string" &&
      typeof weather.condition === "string" &&
      typeof weather.temperatureC === "number"
      ? pass("weather", "weather data is available")
      : fail("weather", `weather failed, got HTTP ${response.status}`);
  })) {
    return finish(checks);
  }

  if (!await appendCheck(checks, async () => {
    const createResponse = await readJson<WaterReminderResponse>(
      "/api/water/reminders",
      options,
      {
        method: "POST",
        body: {
          fromPerson: "self",
          targetPerson: "partner",
          remindOn: options.today,
          message: "local acceptance reminder"
        }
      }
    );
    const reminderId = createResponse.body.reminder?.id;

    if (createResponse.status !== 201 || typeof reminderId !== "string") {
      return fail("water reminders", `water reminder creation failed, got HTTP ${createResponse.status}`);
    }

    const updateResponse = await readJson<WaterReminderResponse>(
      `/api/water/reminders/${encodeURIComponent(reminderId)}/status`,
      options,
      {
        method: "PATCH",
        body: {
          status: "done"
        }
      }
    );

    return updateResponse.status === 200 && updateResponse.body.reminder?.status === "done"
      ? pass("water reminders", "water reminder can be created and completed")
      : fail("water reminders", `water reminder completion failed, got HTTP ${updateResponse.status}`);
  })) {
    return finish(checks);
  }

  if (!await appendCheck(checks, async () => {
    const response = await readJson<RecommendationsResponse>(
      "/api/meals/recommendations",
      options,
      {
        method: "POST",
        body: {
          weather: "normal",
          budget: "normal",
          maxRecentDays: 3
        }
      }
    );

    return response.status === 200 &&
      (response.body.recommendations?.length ?? 0) >= 3 &&
      Array.isArray(response.body.rouletteCandidates)
      ? pass("meal recommendations", "recommendations and roulette candidates are available")
      : fail("meal recommendations", `meal recommendations failed, got HTTP ${response.status}`);
  })) {
    return finish(checks);
  }

  if (!await appendCheck(checks, async () => {
    const response = await readJson<MemoriesResponse>("/api/meals/memories", options);

    return response.status === 200 && Array.isArray(response.body.memories)
      ? pass("meal memories", `${response.body.memories.length} memory rows visible`)
      : fail("meal memories", `meal memories failed, got HTTP ${response.status}`);
  })) {
    return finish(checks);
  }

  if (!await appendCheck(checks, async () => {
    const createResponse = await readJson<MealRequestResponse>(
      "/api/meals/requests",
      options,
      {
        method: "POST",
        body: {
          requester: "self",
          target: "partner",
          title: "local acceptance meal request",
          vendorName: "local vendor",
          note: "acceptance check"
        }
      }
    );
    const requestId = createResponse.body.request?.id;

    if (createResponse.status !== 201 || typeof requestId !== "string") {
      return fail("meal requests", `meal request creation failed, got HTTP ${createResponse.status}`);
    }

    const updateResponse = await readJson<MealRequestResponse>(
      `/api/meals/requests/${encodeURIComponent(requestId)}/status`,
      options,
      {
        method: "PATCH",
        body: {
          status: "planned"
        }
      }
    );

    return updateResponse.status === 200 && updateResponse.body.request?.status === "planned"
      ? pass("meal requests", "meal request can be created and planned")
      : fail("meal requests", `meal request update failed, got HTTP ${updateResponse.status}`);
  })) {
    return finish(checks);
  }

  if (!await appendCheck(checks, async () => {
    const month = options.today.slice(0, 7);
    const response = await readJson<ExpenseSummaryResponse>(
      `/api/expenses/summary?month=${encodeURIComponent(month)}`,
      options
    );
    const summary = response.body.summary;

    return response.status === 200 &&
      typeof summary?.totalCents === "number" &&
      Array.isArray(summary.byCategory) &&
      Array.isArray(summary.byPayer)
      ? pass("expense summary", "monthly expense summary is available")
      : fail("expense summary", `expense summary failed, got HTTP ${response.status}`);
  })) {
    return finish(checks);
  }

  await appendCheck(checks, async () => {
    const response = await readJson<AssistantResponse>(
      "/api/assistant/chat",
      options,
      {
        method: "POST",
        body: {
          message: "今天有什么事",
          date: options.today
        }
      }
    );

    return response.status === 200 && typeof response.body.reply === "string"
      ? pass("assistant", `assistant replied from ${String(response.body.source ?? "unknown")}`)
      : fail("assistant", `assistant failed, got HTTP ${response.status}`);
  });

  return finish(checks);
}
