import { requestApi } from "../../utils/request";

interface AssistantResponse {
  reply: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

Page({
  data: {
    message: "今天有什么事",
    reply: "可以问我今天有什么事、有没有快递、有没有待办。当前本地版先基于数据库生成摘要，后续再接在线模型或 Ollama。",
    loading: false
  },

  onMessageInput(event: { detail: { value: string } }) {
    this.setData({ message: event.detail.value });
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
      }
    });

    this.setData({
      loading: false,
      reply: response.ok && response.data ? response.data.reply : "小管家暂时连不上后端。"
    });
  }
});
