import type { AppEnv } from "../../config/env.js";

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

function createOpenAiCompatibleClient(env: AppEnv): LlmClient | null {
  if (!env.LLM_API_KEY) {
    return null;
  }

  return {
    async chat(messages) {
      const response = await fetch(`${trimTrailingSlash(env.LLM_BASE_URL)}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.LLM_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.LLM_MODEL,
          messages,
          temperature: 0.4
        })
      });
      const data = await parseJsonResponse<OpenAiCompatibleResponse>(response);

      return normalizeContent(data.choices?.[0]?.message?.content);
    }
  };
}

function createOllamaClient(env: AppEnv): LlmClient {
  return {
    async chat(messages) {
      const response = await fetch(`${trimTrailingSlash(env.OLLAMA_BASE_URL)}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.LLM_MODEL,
          messages,
          stream: false
        })
      });
      const data = await parseJsonResponse<OllamaChatResponse>(response);

      return normalizeContent(data.message?.content);
    }
  };
}

export function createLlmClient(env: AppEnv): LlmClient | null {
  if (env.LLM_PROVIDER === "disabled") {
    return null;
  }

  if (env.LLM_PROVIDER === "ollama") {
    return createOllamaClient(env);
  }

  return createOpenAiCompatibleClient(env);
}
