import { requestApi } from "../../utils/request";

interface ReadyResponse {
  status: string;
  checks: {
    database: string;
  };
}

interface SetupStatusResponse {
  configured: boolean;
  coupleName: string | null;
  memberCount: number;
}

Page({
  data: {
    readyText: "检查中",
    setupText: "检查中",
    setupConfigured: false,
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
    void this.loadSetupStatus();
  },

  onShow() {
    void this.loadSetupStatus();
  },

  async loadReadyStatus() {
    const response = await requestApi<ReadyResponse>("/health/ready");
    this.setData({
      readyText: response.ok ? `后端正常，数据库 ${response.data?.checks.database}` : "后端未连接"
    });
  },

  async loadSetupStatus() {
    const response = await requestApi<SetupStatusResponse>("/api/setup/status");
    if (!response.ok || !response.data) {
      this.setData({
        setupText: "未连接后端",
        setupConfigured: false
      });
      return;
    }

    const status = response.data;
    this.setData({
      setupText: status.configured
        ? `已绑定 ${status.coupleName ?? "两人小家"} · ${status.memberCount} 人`
        : "还没绑定，先创建两人小家",
      setupConfigured: status.configured
    });
  },

  goSetup() {
    wx.navigateTo({ url: "/pages/setup/index" });
  },

  goMeals() {
    wx.navigateTo({ url: "/pages/meals/index" });
  },

  goSettings() {
    wx.navigateTo({ url: "/pages/settings/index" });
  }
});
