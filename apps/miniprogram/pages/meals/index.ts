import { requestApi } from "../../utils/request";

interface MealRecommendation {
  slot: "fastest" | "favorite" | "today";
  title: string;
  vendorName: string;
  reason: string;
  estimatedMinutes: number;
  weight: number;
}

interface RecommendationsResponse {
  recommendations: MealRecommendation[];
  rouletteCandidates: MealRecommendation[];
}

interface ParseResponse {
  confirmationRequired: true;
  mealRecord: Record<string, unknown>;
  preferenceUpdates: Record<string, unknown>[];
  memoryText: string;
}

const slotLabels: Record<MealRecommendation["slot"], string> = {
  fastest: "最快拍板",
  favorite: "她可能喜欢",
  today: "今天适合吃"
};

Page({
  data: {
    loading: false,
    recommendations: [] as Array<MealRecommendation & { slotLabel: string }>,
    rouletteCandidates: [] as MealRecommendation[],
    rouletteResult: "",
    memoryText: "今天吃了麻辣烫，花了45，她觉得不错但不要太辣。",
    parsedMemory: null as ParseResponse | null,
    statusText: "先生成推荐，或者记录今天吃了什么"
  },

  onLoad() {
    void this.loadRecommendations();
  },

  async loadRecommendations() {
    this.setData({ loading: true, statusText: "正在生成推荐" });
    const response = await requestApi<RecommendationsResponse>("/api/meals/recommendations", {
      method: "POST",
      data: {
        weather: "normal",
        budget: "normal",
        maxRecentDays: 3
      }
    });

    if (!response.ok || !response.data) {
      this.setData({ loading: false, statusText: "推荐接口未连接，请检查设置里的后端地址" });
      return;
    }

    this.setData({
      loading: false,
      statusText: "已生成 3 个推荐",
      recommendations: response.data.recommendations.map((item) => ({
        ...item,
        slotLabel: slotLabels[item.slot]
      })),
      rouletteCandidates: response.data.rouletteCandidates,
      rouletteResult: ""
    });
  },

  spinRoulette() {
    const candidates = this.data.rouletteCandidates as MealRecommendation[];
    if (candidates.length === 0) {
      wx.showToast({ title: "先生成推荐", icon: "none" });
      return;
    }

    const total = candidates.reduce((sum, item) => sum + item.weight, 0);
    const fallback = candidates[0];
    if (!fallback) {
      wx.showToast({ title: "暂无候选", icon: "none" });
      return;
    }

    let pick = Math.random() * total;
    const result = candidates.find((item) => {
      pick -= item.weight;
      return pick <= 0;
    }) ?? fallback;

    this.setData({
      rouletteResult: `${result.title} · ${result.vendorName}`
    });
  },

  onMemoryInput(event: { detail: { value: string } }) {
    this.setData({ memoryText: event.detail.value });
  },

  async parseMemory() {
    const text = `${this.data.memoryText ?? ""}`.trim();
    if (text.length === 0) {
      wx.showToast({ title: "先写吃了什么", icon: "none" });
      return;
    }

    const response = await requestApi<ParseResponse>("/api/meals/memory/parse", {
      method: "POST",
      data: {
        text,
        person: "both"
      }
    });

    if (!response.ok || !response.data) {
      this.setData({ statusText: "解析失败，请检查后端地址" });
      return;
    }

    this.setData({
      parsedMemory: response.data,
      statusText: "解析完成，确认后会写入本地数据库"
    });
  },

  async confirmMemory() {
    const parsed = this.data.parsedMemory as ParseResponse | null;
    if (!parsed) {
      wx.showToast({ title: "先解析记忆", icon: "none" });
      return;
    }

    const response = await requestApi<{ memoryText: string }>("/api/meals/memory/confirm", {
      method: "POST",
      data: parsed
    });

    this.setData({
      parsedMemory: null,
      statusText: response.ok ? "已保存饮食记忆" : "保存失败，请重试"
    });

    if (response.ok) {
      void this.loadRecommendations();
    }
  }
});
