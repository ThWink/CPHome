import { afterEach, describe, expect, it, vi } from "vitest";
import { getEnv } from "../src/config/env.js";
import { createLlmClient, getLlmStatus } from "../src/features/assistant/llm-client.js";

describe("LLM configuration", () => {
  it("defaults to local fallback when no provider is configured", () => {
    const env = getEnv({});

    expect(env.LLM_PROVIDER).toBe("disabled");
    expect(env.LLM_BASE_URL).toBe("https://api.openai.com/v1");
    expect(env.OLLAMA_BASE_URL).toBe("http://127.0.0.1:11434");
    expect(env.LLM_REQUEST_TIMEOUT_MS).toBe(15_000);
  });

  it("normalizes OpenAI-compatible provider settings", () => {
    const env = getEnv({
      LLM_PROVIDER: "openai-compatible",
      LLM_BASE_URL: "https://example.com/v1/",
      LLM_API_KEY: "test-key",
      LLM_MODEL: "test-model"
    });

    expect(env.LLM_PROVIDER).toBe("openai-compatible");
    expect(env.LLM_BASE_URL).toBe("https://example.com/v1/");
    expect(env.LLM_API_KEY).toBe("test-key");
    expect(env.LLM_MODEL).toBe("test-model");
  });
});

describe("getLlmStatus", () => {
  it("reports disabled local fallback by default", () => {
    expect(getLlmStatus(getEnv({}))).toEqual({
      provider: "disabled",
      model: "gpt-4o-mini",
      enabled: false,
      configured: false,
      endpoint: null,
      message: "未启用模型，AI 小管家会使用本地摘要。"
    });
  });

  it("reports missing key for OpenAI-compatible providers", () => {
    expect(getLlmStatus(getEnv({
      LLM_PROVIDER: "openai-compatible",
      LLM_BASE_URL: "https://llm.example.com/v1/",
      LLM_MODEL: "test-model"
    }))).toMatchObject({
      provider: "openai-compatible",
      model: "test-model",
      enabled: false,
      configured: false,
      endpoint: "https://llm.example.com/v1"
    });
  });

  it("reports configured Ollama providers without an API key", () => {
    expect(getLlmStatus(getEnv({
      LLM_PROVIDER: "ollama",
      OLLAMA_BASE_URL: "http://127.0.0.1:11434/",
      LLM_MODEL: "qwen2.5:7b"
    }))).toMatchObject({
      provider: "ollama",
      model: "qwen2.5:7b",
      enabled: true,
      configured: true,
      endpoint: "http://127.0.0.1:11434"
    });
  });
});

describe("createLlmClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when provider is disabled", () => {
    const env = getEnv({});

    expect(createLlmClient(env)).toBeNull();
  });

  it("calls an OpenAI-compatible chat completions endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "今晚可以点酸汤肥牛。"
            }
          }
        ]
      })
    } as Response);

    const env = getEnv({
      LLM_PROVIDER: "openai-compatible",
      LLM_BASE_URL: "https://llm.example.com/v1/",
      LLM_API_KEY: "test-key",
      LLM_MODEL: "test-model"
    });
    const client = createLlmClient(env);

    const reply = await client?.chat([
      {
        role: "user",
        content: "今晚吃什么？"
      }
    ]);

    expect(reply).toBe("今晚可以点酸汤肥牛。");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://llm.example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json"
        }),
        body: expect.stringContaining('"model":"test-model"')
      })
    );
  });

  it("prepares Ollama chat requests without an API key", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: "今天有 1 个待办。"
        }
      })
    } as Response);

    const env = getEnv({
      LLM_PROVIDER: "ollama",
      OLLAMA_BASE_URL: "http://127.0.0.1:11434/",
      LLM_MODEL: "qwen2.5:7b"
    });
    const client = createLlmClient(env);

    const reply = await client?.chat([
      {
        role: "user",
        content: "今天有什么事？"
      }
    ]);

    expect(reply).toBe("今天有 1 个待办。");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json"
        }),
        body: expect.stringContaining('"model":"qwen2.5:7b"')
      })
    );
  });
});
