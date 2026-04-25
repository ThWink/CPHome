import {
  getApiBaseUrl,
  getApiToken,
  requestApi,
  setApiBaseUrl,
  setApiToken
} from "../../utils/request";

interface ReadyResponse {
  status: string;
  checks: {
    database: string;
  };
}

interface MealMemory {
  id: string;
  content: string;
  createdAt: string;
  meal: {
    occurredOn: string;
    vendorName: string;
    items: string[];
    note: string | null;
  };
}

interface MemoriesResponse {
  memories: MealMemory[];
}

interface TastePreference {
  id: string;
  person: "self" | "partner" | "both";
  category: string;
  value: string;
  sentiment: "like" | "dislike" | "avoid";
  weight: number;
  note: string | null;
}

interface PreferencesResponse {
  preferences: TastePreference[];
}

const sentimentLabels: Record<TastePreference["sentiment"], string> = {
  like: "喜欢",
  dislike: "少推荐",
  avoid: "避免"
};

Page({
  data: {
    apiBaseUrl: "",
    apiToken: "",
    healthText: "未检查",
    memoryText: "未加载",
    memories: [] as Array<MealMemory & { itemText: string }>,
    preferences: [] as Array<TastePreference & { sentimentText: string }>
  },

  onLoad() {
    this.setData({
      apiBaseUrl: getApiBaseUrl(),
      apiToken: getApiToken()
    });
  },

  onShow() {
    void this.loadMemoryData();
  },

  onApiInput(event: { detail: { value: string } }) {
    this.setData({ apiBaseUrl: event.detail.value });
  },

  onApiTokenInput(event: { detail: { value: string } }) {
    this.setData({ apiToken: event.detail.value });
  },

  saveApiBaseUrl() {
    const apiBaseUrl = setApiBaseUrl(`${this.data.apiBaseUrl ?? ""}`);
    this.setData({ apiBaseUrl });
    wx.showToast({ title: "已保存", icon: "success" });
  },

  saveApiToken() {
    const apiToken = setApiToken(`${this.data.apiToken ?? ""}`);
    this.setData({ apiToken });
    wx.showToast({ title: apiToken.length > 0 ? "Token 已保存" : "Token 已清空", icon: "success" });
  },

  async checkHealth() {
    const response = await requestApi<ReadyResponse>("/health/ready");
    this.setData({
      healthText: response.ok ? `后端正常，数据库 ${response.data?.checks.database}` : "后端未连接"
    });
  },

  async loadMemoryData() {
    const [memoriesResponse, preferencesResponse] = await Promise.all([
      requestApi<MemoriesResponse>("/api/meals/memories"),
      requestApi<PreferencesResponse>("/api/meals/preferences")
    ]);

    if (!memoriesResponse.ok || !memoriesResponse.data || !preferencesResponse.ok || !preferencesResponse.data) {
      this.setData({
        memoryText: memoriesResponse.statusCode === 401 || preferencesResponse.statusCode === 401
          ? "Token 未填写或不正确"
          : "记忆接口未连接"
      });
      return;
    }

    this.setData({
      memoryText: `${memoriesResponse.data.memories.length} 条饮食记忆，${preferencesResponse.data.preferences.length} 条偏好`,
      memories: memoriesResponse.data.memories.map((memory) => ({
        ...memory,
        itemText: `${memory.meal.vendorName} · ${memory.meal.items.join("、")}`
      })),
      preferences: preferencesResponse.data.preferences.map((preference) => ({
        ...preference,
        sentimentText: sentimentLabels[preference.sentiment]
      }))
    });
  },

  async deleteMemory(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    const response = await requestApi(`/api/meals/memories/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      wx.showToast({ title: response.statusCode === 401 ? "Token 不正确" : "删除失败", icon: "none" });
      return;
    }

    wx.showToast({ title: "已删除", icon: "success" });
    void this.loadMemoryData();
  }
});
