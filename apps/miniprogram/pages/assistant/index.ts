import { requestApi } from "../../utils/request";

interface AssistantStatus {
  provider: "disabled" | "openai-compatible" | "ollama";
  model: string;
  enabled: boolean;
  configured: boolean;
  endpoint: string | null;
  message: string;
}

interface AssistantStatusResponse {
  assistant: AssistantStatus;
}

interface AssistantResponse {
  reply: string;
  source: "local" | "llm";
  assistant: AssistantStatus;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getProviderText(status: AssistantStatus | null): string {
  if (!status) {
    return "未连接";
  }

  if (status.provider === "openai-compatible") {
    return status.enabled ? "在线模型" : "缺少 Key";
  }

  if (status.provider === "ollama") {
    return "Ollama";
  }

  return "本地摘要";
}

function getSourceText(source: "local" | "llm", status: AssistantStatus | null): string {
  if (source === "llm") {
    return getProviderText(status);
  }

  return "本地摘要";
}

function getEndpointText(status: AssistantStatus | null): string {
  if (!status?.endpoint) {
    return "";
  }

  return status.endpoint;
}

Page({
  data: {
    message: "今天有什么事",
    reply: "可以问我今天有什么事、有没有快递、有没有待办。配置后端模型环境变量后，会优先使用模型回复。",
    sourceText: "本地摘要",
    statusText: "正在检查 AI 连接",
    providerText: "未连接",
    modelText: "",
    endpointText: "",
    loading: false
  },

  onLoad() {
    void this.loadAssistantStatus();
  },

  onMessageInput(event: { detail: { value: string } }) {
    this.setData({ message: event.detail.value });
  },

  async loadAssistantStatus() {
    const response = await requestApi<AssistantStatusResponse>("/api/assistant/status");
    if (!response.ok || !response.data) {
      this.setData({
        statusText: response.statusCode === 401 ? "Token 未填写或不正确" : "AI 状态未连接",
        providerText: "未连接",
        modelText: "",
        endpointText: ""
      });
      return;
    }

    const status = response.data.assistant;
    this.setData({
      statusText: status.message,
      providerText: getProviderText(status),
      modelText: status.model,
      endpointText: getEndpointText(status),
      sourceText: status.enabled ? getProviderText(status) : "本地摘要"
    });
  },

  async askAssistant() {
    const message = `${this.data.message ?? ""}`.trim();
    if (!message) {
      wx.showToast({ title: "先写问题", icon: "none" });
      return;
    }

    this.setData({ loading: true });
    const response = await requestApi<AssistantResponse>("/api/assistant/chat", {
      method: "POST",
      data: {
        message,
        date: today()
      },
      timeout: 65000
    });

    this.setData({
      loading: false,
      reply: response.ok && response.data ? response.data.reply : "小管家暂时连不上后端。",
      sourceText: response.ok && response.data
        ? getSourceText(response.data.source, response.data.assistant)
        : "本地摘要",
      statusText: response.ok && response.data ? response.data.assistant.message : this.data.statusText,
      providerText: response.ok && response.data ? getProviderText(response.data.assistant) : this.data.providerText,
      modelText: response.ok && response.data ? response.data.assistant.model : this.data.modelText,
      endpointText: response.ok && response.data ? getEndpointText(response.data.assistant) : this.data.endpointText
    });
  }
});
