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

interface DashboardResponse {
  dashboard: {
    water: {
      people: Array<{
        person: "self" | "partner";
        drinkCount: number;
        totalMl: number;
      }>;
    };
    pendingParcels: Array<{
      title: string;
      pickupCode: string;
      location: string;
    }>;
    recentExpense: {
      amountCents: number;
      note: string | null;
    } | null;
  };
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
    void this.loadDashboard();
  },

  onShow() {
    void this.loadSetupStatus();
    void this.loadDashboard();
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

  async loadDashboard() {
    const response = await requestApi<DashboardResponse>("/api/dashboard/today");
    if (!response.ok || !response.data) {
      return;
    }

    const water = response.data.dashboard.water.people;
    const selfWater = water.find((item) => item.person === "self");
    const partnerWater = water.find((item) => item.person === "partner");
    const parcels = response.data.dashboard.pendingParcels;
    const recentExpense = response.data.dashboard.recentExpense;

    this.setData({
      waterText: `我 ${selfWater?.drinkCount ?? 0} 次 / 对方 ${partnerWater?.drinkCount ?? 0} 次`,
      parcelText: parcels.length > 0
        ? `${parcels.length} 个待取，最近 ${parcels[0]?.pickupCode ?? ""}`
        : "暂无待取快递",
      expenseText: recentExpense
        ? `${(recentExpense.amountCents / 100).toFixed(2)} 元 · ${recentExpense.note ?? "共同支出"}`
        : "暂无共同支出"
    });
  },

  goSetup() {
    wx.navigateTo({ url: "/pages/setup/index" });
  },

  goMeals() {
    wx.navigateTo({ url: "/pages/meals/index" });
  },

  goWater() {
    wx.navigateTo({ url: "/pages/water/index" });
  },

  goParcels() {
    wx.navigateTo({ url: "/pages/parcels/index" });
  },

  goExpenses() {
    wx.navigateTo({ url: "/pages/expenses/index" });
  },

  goSettings() {
    wx.navigateTo({ url: "/pages/settings/index" });
  }
});
