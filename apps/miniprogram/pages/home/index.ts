import { requestApi } from "../../utils/request";

interface ReadyResponse {
  status: string;
  checks: {
    database: string;
  };
}

Page({
  data: {
    readyText: "检查中",
    weatherText: "天气服务待接入",
    waterText: "今天还没有喝水记录",
    parcelText: "暂无待取快递",
    expenseText: "暂无共同支出",
    timeline: [
      "可以先去“吃什么”生成今晚推荐",
      "后续会接入喝水、快递、记账和天气"
    ]
  },

  onLoad() {
    void this.loadReadyStatus();
  },

  async loadReadyStatus() {
    const response = await requestApi<ReadyResponse>("/health/ready");
    this.setData({
      readyText: response.ok ? `后端正常，数据库 ${response.data?.checks.database}` : "后端未连接"
    });
  },

  goMeals() {
    wx.navigateTo({ url: "/pages/meals/index" });
  },

  goSettings() {
    wx.navigateTo({ url: "/pages/settings/index" });
  }
});
