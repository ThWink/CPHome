import type { AppEnv } from "../../config/env.js";
import type { AssistantStatus } from "@couple-life/shared";

export type LlmRole = "system" | "user" | "assistant";

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmClient {
  chat(messages: LlmMessage[]): Promise<string>;
}

interface OpenAiCompatibleResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

interface OllamaChatResponse {
  message?: {
    content?: unknown;
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed with ${response.status}: ${text.slice(0, 200)}`);
  }

  return await response.json() as T;
}

function normalizeContent(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("LLM response did not include message content");
  }

  return value.trim();
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`LLM request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function createOpenAiCompatibleClient(env: AppEnv): LlmClient {
  const apiKey = env.LLM_API_KEY?.trim() ?? "";

  return {
    async chat(messages) {
      const response = await fetchWithTimeout(`${trimTrailingSlash(env.LLM_BASE_URL)}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.LLM_MODEL,
          messages,
          temperature: 0.4
        })
      }, env.LLM_REQUEST_TIMEOUT_MS);
      const data = await parseJsonResponse<OpenAiCompatibleResponse>(response);

      return normalizeContent(data.choices?.[0]?.message?.content);
    }
  };
}

function createOllamaClient(env: AppEnv): LlmClient {
  return {
    async chat(messages) {
      const response = await fetchWithTimeout(`${trimTrailingSlash(env.OLLAMA_BASE_URL)}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.LLM_MODEL,
          messages,
          stream: false
        })
      }, env.LLM_REQUEST_TIMEOUT_MS);
      const data = await parseJsonResponse<OllamaChatResponse>(response);

      return normalizeContent(data.message?.content);
    }
  };
}

export function createLlmClient(env: AppEnv): LlmClient | null {
  const status = getLlmStatus(env);
  if (!status.enabled) {
    return null;
  }

  if (env.LLM_PROVIDER === "ollama") {
    return createOllamaClient(env);
  }

  return createOpenAiCompatibleClient(env);
}

export function getLlmStatus(env: AppEnv): AssistantStatus {
  if (env.LLM_PROVIDER === "disabled") {
    return {
      provider: "disabled",
      model: env.LLM_MODEL,
      enabled: false,
      configured: false,
      endpoint: null,
      message: "未启用模型，AI 小管家会使用本地摘要。"
    };
  }

  if (env.LLM_PROVIDER === "ollama") {
    return {
      provider: "ollama",
      model: env.LLM_MODEL,
      enabled: true,
      configured: true,
      endpoint: trimTrailingSlash(env.OLLAMA_BASE_URL),
      message: "已配置 Ollama，本地模型不可达时会回退本地摘要。"
    };
  }

  const hasApiKey = typeof env.LLM_API_KEY === "string" && env.LLM_API_KEY.trim().length > 0;
  return {
    provider: "openai-compatible",
    model: env.LLM_MODEL,
    enabled: hasApiKey,
    configured: hasApiKey,
    endpoint: trimTrailingSlash(env.LLM_BASE_URL),
    message: hasApiKey
      ? "已配置 OpenAI 兼容接口，模型不可达时会回退本地摘要。"
      : "缺少 LLM_API_KEY，AI 小管家会使用本地摘要。"
  };
}

export function createInjectedLlmStatus(model = "injected-test-client"): AssistantStatus {
  return {
    provider: "openai-compatible",
    model,
    enabled: true,
    configured: true,
    endpoint: null,
    message: "已注入测试模型客户端。"
  };
}
