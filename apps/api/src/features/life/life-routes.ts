import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import type { AssistantChatResponse, AssistantStatus } from "@couple-life/shared";
import type { AppDatabase } from "../../db/client.js";
import type { LlmClient, LlmMessage } from "../assistant/llm-client.js";
import type { WeatherClient } from "../weather/weather-client.js";
import {
  createAnniversary,
  createExpense,
  createParcel,
  createTodo,
  createWaterDrink,
  createWaterReminder,
  getDashboardToday,
  getExpenseMonthlySummary,
  getWeatherToday,
  getWaterTodaySummary,
  listOpenTodos,
  listUpcomingAnniversaries,
  listPendingParcels,
  listPendingWaterReminders,
  listRecentExpenses,
  normalizeLocalDate,
  normalizeLocalMonth,
  updateParcelStatus,
  updateTodoStatus,
  updateWaterReminderStatus
} from "./life-repository.js";
import { listLifeEvents } from "./timeline-repository.js";

export interface LifeRouteOptions {
  database: AppDatabase;
  llmClient?: LlmClient | null;
  assistantStatus?: AssistantStatus;
  weatherClient?: WeatherClient | null;
  parcelImageDir?: string;
}

const parcelImageMediaTypes = {
  "image/jpeg": { extension: "jpg", contentType: "image/jpeg" },
  "image/png": { extension: "png", contentType: "image/png" },
  "image/webp": { extension: "webp", contentType: "image/webp" }
} as const;

type ParcelImageMediaType = keyof typeof parcelImageMediaTypes;

function getRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};
}

function normalizeBase64Image(value: unknown): Buffer {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("dataBase64 is required");
  }

  const normalized = value.includes(",")
    ? value.slice(value.lastIndexOf(",") + 1).trim()
    : value.trim();

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new Error("dataBase64 must be valid base64");
  }

  const buffer = Buffer.from(normalized, "base64");
  if (buffer.length === 0) {
    throw new Error("image cannot be empty");
  }

  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("image must be 5MB or smaller");
  }

  return buffer;
}

function normalizeParcelImageMediaType(value: unknown): ParcelImageMediaType {
  if (
    typeof value === "string" &&
    Object.hasOwn(parcelImageMediaTypes, value)
  ) {
    return value as ParcelImageMediaType;
  }

  throw new Error("mediaType is invalid");
}

function getParcelImageFileName(params: unknown): string {
  const record = getRecord(params);
  const fileName = record.fileName;

  if (typeof fileName !== "string" || !/^[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(fileName)) {
    throw new Error("image file name is invalid");
  }

  return fileName;
}

function getParcelImageContentType(fileName: string): string {
  if (fileName.endsWith(".png")) {
    return "image/png";
  }

  if (fileName.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

function getDefaultAssistantStatus(): AssistantStatus {
  return {
    provider: "disabled",
    model: "local-summary",
    enabled: false,
    configured: false,
    endpoint: null,
    message: "未启用模型，AI 小管家会使用本地摘要。"
  };
}

function getQueryDate(query: unknown): string {
  const record = typeof query === "object" && query !== null
    ? query as Record<string, unknown>
    : {};

  return normalizeLocalDate(record.date);
}

function getQueryMonth(query: unknown): string {
  const record = typeof query === "object" && query !== null
    ? query as Record<string, unknown>
    : {};

  return normalizeLocalMonth(record.month);
}

function getParcelId(params: unknown): string {
  return getRequiredId(params, "parcel id");
}

function getTodoId(params: unknown): string {
  return getRequiredId(params, "todo id");
}

function getWaterReminderId(params: unknown): string {
  return getRequiredId(params, "water reminder id");
}

function getRequiredId(params: unknown, label: string): string {
  const record = typeof params === "object" && params !== null
    ? params as Record<string, unknown>
    : {};

  if (typeof record.id !== "string" || record.id.trim().length === 0) {
    throw new Error(`${label} is required`);
  }

  return record.id;
}

function getQueryString(query: unknown, fieldName: string): unknown {
  const record = typeof query === "object" && query !== null
    ? query as Record<string, unknown>
    : {};

  return record[fieldName];
}

function getBodyDate(body: unknown): string {
  const record = typeof body === "object" && body !== null
    ? body as Record<string, unknown>
    : {};

  return normalizeLocalDate(record.date);
}

function getBodyMessage(body: unknown): string {
  const record = typeof body === "object" && body !== null
    ? body as Record<string, unknown>
    : {};

  if (typeof record.message !== "string" || record.message.trim().length === 0) {
    throw new Error("message is required");
  }

  return record.message.trim();
}

function buildLocalAssistantReply(date: string, dashboard: ReturnType<typeof getDashboardToday>): string {
  const summaryParts = [
    `待取快递 ${dashboard.pendingParcels.length} 个`,
    `想吃请求 ${dashboard.pendingMealRequests.length} 个`,
    `待办 ${dashboard.openTodos.length} 个`,
    `纪念日提醒 ${dashboard.upcomingAnniversaries.length} 个`,
    `喝水记录 ${dashboard.water.people.reduce((sum, item) => sum + item.drinkCount, 0)} 次`
  ];

  return `${date} 今天有：${summaryParts.join("，")}`;
}

function buildAssistantMessages(
  message: string,
  dashboard: ReturnType<typeof getDashboardToday>
): LlmMessage[] {
  return [
    {
      role: "system",
      content: [
        "你是同居情侣生活助手，只根据用户自托管系统里的生活数据回答。",
        "你可以帮助整理今天的待办、快递、喝水提醒、想吃请求、纪念日和支出。",
        "回答要简短、清晰、可执行，不要编造系统里没有的数据。",
        "如果数据不足，直接说当前本地数据还不完整。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        message,
        "",
        "当前本地生活数据：",
        JSON.stringify(dashboard)
      ].join("\n")
    }
  ];
}

export async function registerLifeRoutes(
  app: FastifyInstance,
  options: LifeRouteOptions
): Promise<void> {
  const parcelImageDir = resolve(options.parcelImageDir ?? "data/parcel-images");
  const assistantStatus = options.assistantStatus ?? getDefaultAssistantStatus();

  app.post("/api/parcels/images", async (request, reply) => {
    try {
      const body = getRecord(request.body);
      const mediaType = normalizeParcelImageMediaType(body.mediaType);
      const buffer = normalizeBase64Image(body.dataBase64);
      const imageType = parcelImageMediaTypes[mediaType];
      const fileName = `${nanoid()}.${imageType.extension}`;

      mkdirSync(parcelImageDir, { recursive: true });
      writeFileSync(join(parcelImageDir, fileName), buffer);

      return reply.code(201).send({
        image: {
          imagePath: `/api/parcels/images/${fileName}`,
          mediaType,
          sizeBytes: buffer.length
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_PARCEL_IMAGE",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/parcels/images/:fileName", async (request, reply) => {
    try {
      const fileName = getParcelImageFileName(request.params);
      const filePath = join(parcelImageDir, fileName);

      if (!existsSync(filePath)) {
        return reply.code(404).send({
          error: "PARCEL_IMAGE_NOT_FOUND",
          message: "parcel image not found"
        });
      }

      return reply
        .header("cache-control", "public, max-age=31536000, immutable")
        .type(getParcelImageContentType(fileName))
        .send(readFileSync(filePath));
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_PARCEL_IMAGE",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/weather/today", async (request) => {
    const city = getQueryString(request.query, "city");

    if (options.weatherClient) {
      try {
        return {
          weather: await options.weatherClient.getToday(city)
        };
      } catch (error) {
        request.log.warn({ error }, "online weather failed, falling back to local weather");
      }
    }

    return {
      weather: getWeatherToday(city)
    };
  });

  app.post("/api/water/drinks", async (request, reply) => {
    try {
      const drink = createWaterDrink(options.database, request.body);
      return reply.code(201).send({ drink });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_WATER_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/water/today", async (request, reply) => {
    try {
      const date = getQueryDate(request.query);
      return { water: getWaterTodaySummary(options.database, date) };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_WATER_QUERY",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/water/reminders", async (request, reply) => {
    try {
      const reminder = createWaterReminder(options.database, request.body);
      return reply.code(201).send({ reminder });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_WATER_REMINDER_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/water/reminders/pending", async (request, reply) => {
    try {
      const date = getQueryDate(request.query);
      return {
        reminders: listPendingWaterReminders(options.database, date)
      };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_WATER_REMINDER_QUERY",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.patch("/api/water/reminders/:id/status", async (request, reply) => {
    try {
      const id = getWaterReminderId(request.params);
      const reminder = updateWaterReminderStatus(options.database, id, request.body);
      return { reminder };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(error.message === "water reminder not found" ? 404 : 400).send({
          error: error.message === "water reminder not found"
            ? "WATER_REMINDER_NOT_FOUND"
            : "INVALID_WATER_REMINDER_STATUS",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/parcels", async (request, reply) => {
    try {
      const parcel = createParcel(options.database, request.body);
      return reply.code(201).send({ parcel });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_PARCEL_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/parcels/pending", async () => ({
    parcels: listPendingParcels(options.database)
  }));

  app.patch("/api/parcels/:id/status", async (request, reply) => {
    try {
      const id = getParcelId(request.params);
      const parcel = updateParcelStatus(options.database, id, request.body);
      return { parcel };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(error.message === "parcel not found" ? 404 : 400).send({
          error: error.message === "parcel not found" ? "PARCEL_NOT_FOUND" : "INVALID_PARCEL_STATUS",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/expenses", async (request, reply) => {
    try {
      const expense = createExpense(options.database, request.body);
      return reply.code(201).send({ expense });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_EXPENSE_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/expenses/recent", async () => ({
    expenses: listRecentExpenses(options.database, 20)
  }));

  app.get("/api/expenses/summary", async (request, reply) => {
    try {
      const month = getQueryMonth(request.query);
      return {
        summary: getExpenseMonthlySummary(options.database, month)
      };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_EXPENSE_MONTH",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/todos", async (request, reply) => {
    try {
      const todo = createTodo(options.database, request.body);
      return reply.code(201).send({ todo });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_TODO_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/todos/open", async () => ({
    todos: listOpenTodos(options.database)
  }));

  app.patch("/api/todos/:id/status", async (request, reply) => {
    try {
      const id = getTodoId(request.params);
      const todo = updateTodoStatus(options.database, id, request.body);
      return { todo };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(error.message === "todo not found" ? 404 : 400).send({
          error: error.message === "todo not found" ? "TODO_NOT_FOUND" : "INVALID_TODO_STATUS",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post("/api/anniversaries", async (request, reply) => {
    try {
      const anniversary = createAnniversary(options.database, request.body);
      return reply.code(201).send({ anniversary });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_ANNIVERSARY_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/anniversaries/upcoming", async (request, reply) => {
    try {
      const date = getQueryDate(request.query);
      return {
        anniversaries: listUpcomingAnniversaries(options.database, date)
      };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_ANNIVERSARY_QUERY",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/dashboard/today", async (request, reply) => {
    try {
      const date = getQueryDate(request.query);
      return { dashboard: getDashboardToday(options.database, date) };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_DASHBOARD_QUERY",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/api/life/timeline", async () => ({
    events: listLifeEvents(options.database, 30)
  }));

  app.get("/api/assistant/status", async () => ({
    assistant: assistantStatus
  }));

  app.post("/api/assistant/chat", async (request, reply) => {
    try {
      const date = getBodyDate(request.body);
      const message = getBodyMessage(request.body);
      const dashboard = getDashboardToday(options.database, date);

      if (options.llmClient) {
        try {
          const modelReply = await options.llmClient.chat(buildAssistantMessages(message, dashboard));
          const response: AssistantChatResponse = {
            reply: modelReply,
            source: "llm",
            assistant: assistantStatus,
            dashboard
          };
          return response;
        } catch (error) {
          request.log.warn({ error }, "LLM assistant reply failed, falling back to local summary");
        }
      }

      const response: AssistantChatResponse = {
        reply: buildLocalAssistantReply(date, dashboard),
        source: "local",
        assistant: assistantStatus,
        dashboard
      };
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_ASSISTANT_REQUEST",
          message: error.message
        });
      }

      throw error;
    }
  });
}
