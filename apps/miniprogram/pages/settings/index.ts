import { getApiBaseUrl, requestApi, setApiBaseUrl } from "../../utils/request";

interface ReadyResponse {
  status: string;
  checks: {
    database: string;
  };
}

Page({
  data: {
    apiBaseUrl: "",
    healthText: "未检查"
  },

  onLoad() {
    this.setData({ apiBaseUrl: getApiBaseUrl() });
  },

  onApiInput(event: { detail: { value: string } }) {
    this.setData({ apiBaseUrl: event.detail.value });
  },

  saveApiBaseUrl() {
    const apiBaseUrl = setApiBaseUrl(`${this.data.apiBaseUrl ?? ""}`);
    this.setData({ apiBaseUrl });
    wx.showToast({ title: "已保存", icon: "success" });
  },

  async checkHealth() {
    const response = await requestApi<ReadyResponse>("/health/ready");
    this.setData({
      healthText: response.ok ? `后端正常，数据库 ${response.data?.checks.database}` : "后端未连接"
    });
  }
});
