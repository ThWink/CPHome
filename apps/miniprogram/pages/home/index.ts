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
    date: string;
    weather: {
      city: string;
      condition: string;
      temperatureC: number;
      advice: string;
    };
    water: {
      people: Array<{
        person: "self" | "partner";
        drinkCount: number;
        totalMl: number;
      }>;
    };
    pendingWaterReminders: Array<{
      targetPerson: "self" | "partner";
      message: string | null;
    }>;
    pendingMealRequests: Array<{
      title: string;
      vendorName: string | null;
      note: string | null;
    }>;
    pendingParcels: Array<{
      title: string;
      pickupCode: string;
      location: string;
    }>;
    recentExpense: {
      amountCents: number;
      note: string | null;
    } | null;
    openTodos: Array<{
      title: string;
      dueOn: string | null;
    }>;
    upcomingAnniversaries: Array<{
      title: string;
      nextOn: string;
      daysLeft: number;
    }>;
    timeline: Array<{
      id: string;
      title: string;
      subtitle: string | null;
      occurredAt: string;
    }>;
  };
}

interface TimelineViewItem {
  id: string;
  time: string;
  text: string;
}

function pad2(value: number): string {
  return `${value}`.padStart(2, "0");
}

function formatTimelineTime(value: string | null | undefined, dashboardDate: string): string {
  if (!value) {
    return "今日";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "今日";
  }

  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const localDate = `${date.getFullYear()}-${month}-${day}`;

  return localDate === dashboardDate ? time : `${month}-${day} ${time}`;
}

function normalizeTimelineText(title: string, subtitle: string | null): string {
  const knownTestText: Record<string, string> = {
    "local acceptance meal request": "本地验收想吃请求",
    "local acceptance reminder": "本地验收喝水提醒",
    "local vendor": "本地验收商家",
    "acceptance check": "验收检查"
  };
  const normalizedSubtitle = subtitle ? knownTestText[subtitle] ?? subtitle : null;

  return normalizedSubtitle ? `${title}：${normalizedSubtitle}` : title;
}

Page({
  data: {
    readyText: "检查中",
    setupText: "检查中",
    setupConfigured: false,
    mealText: "外卖推荐和想吃请求",
    weatherText: "天气服务待接入",
    waterText: "今天还没有喝水记录",
    parcelText: "暂无待取快递",
    expenseText: "暂无共同支出",
    todoText: "暂无待办",
    anniversaryText: "暂无纪念日提醒",
    heroText: "把今天的小事照看好",
    timeline: [
      {
        id: "empty-meal",
        time: "今日",
        text: "可以先去“今晚吃什么”生成外卖推荐"
      },
      {
        id: "empty-summary",
        time: "今日",
        text: "喝水、快递、记账和天气会在这里汇总"
      }
    ] as TimelineViewItem[]
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

    const dashboard = response.data.dashboard;
    const water = dashboard.water.people;
    const selfWater = water.find((item) => item.person === "self");
    const partnerWater = water.find((item) => item.person === "partner");
    const weather = dashboard.weather;
    const parcels = dashboard.pendingParcels;
    const waterReminders = dashboard.pendingWaterReminders;
    const mealRequests = dashboard.pendingMealRequests;
    const recentExpense = dashboard.recentExpense;
    const todos = dashboard.openTodos;
    const anniversaries = dashboard.upcomingAnniversaries;
    const timeline = dashboard.timeline;
    const timelineItems = timeline.length > 0
      ? timeline.map((item) => ({
        id: item.id,
        time: formatTimelineTime(item.occurredAt, dashboard.date),
        text: normalizeTimelineText(item.title, item.subtitle)
      }))
      : [
        {
          id: "fallback-weather",
          time: "今日",
          text: `天气：${weather.condition}，${weather.advice}`
        },
        {
          id: "fallback-meal",
          time: "今日",
          text: mealRequests.length > 0
            ? `想吃：${mealRequests[0]?.title ?? ""}`
            : "没有待安排想吃请求"
        },
        {
          id: "fallback-water",
          time: "今日",
          text: waterReminders.length > 0
            ? `喝水提醒：${waterReminders[0]?.message ?? "记得喝水"}`
            : "没有待处理喝水提醒"
        },
        {
          id: "fallback-todo",
          time: "今日",
          text: todos.length > 0 ? `待办：${todos[0]?.title ?? ""}` : "今天没有未完成待办"
        },
        {
          id: "fallback-parcel",
          time: "今日",
          text: parcels.length > 0 ? `快递：${parcels[0]?.pickupCode ?? ""}` : "暂无待取快递"
        },
        {
          id: "fallback-anniversary",
          time: "今日",
          text: anniversaries.length > 0 ? `纪念日：${anniversaries[0]?.title ?? ""}` : "没有临近纪念日"
        }
      ];

    this.setData({
      weatherText: `${weather.city} ${weather.condition} ${weather.temperatureC}℃ · ${weather.advice}`,
      mealText: mealRequests.length > 0
        ? `${mealRequests.length} 个想吃请求，最近 ${mealRequests[0]?.title ?? ""}`
        : "外卖推荐和转盘选择",
      waterText: `我 ${selfWater?.drinkCount ?? 0} 次 / 对方 ${partnerWater?.drinkCount ?? 0} 次，提醒 ${waterReminders.length} 个`,
      parcelText: parcels.length > 0
        ? `${parcels.length} 个待取，最近 ${parcels[0]?.pickupCode ?? ""}`
        : "暂无待取快递",
      expenseText: recentExpense
        ? `${(recentExpense.amountCents / 100).toFixed(2)} 元 · ${recentExpense.note ?? "共同支出"}`
        : "暂无共同支出",
      todoText: todos.length > 0
        ? `${todos.length} 个待办，最近 ${todos[0]?.title ?? ""}`
        : "暂无待办",
      anniversaryText: anniversaries.length > 0
        ? `${anniversaries[0]?.title ?? ""} · 还有 ${anniversaries[0]?.daysLeft ?? 0} 天`
        : "暂无纪念日提醒",
      heroText: `${weather.condition} ${weather.temperatureC}℃，${todos.length} 个待办，${parcels.length} 个快递，${waterReminders.length} 个喝水提醒，${mealRequests.length} 个想吃请求`,
      timeline: timelineItems
    });
  },

  goSetup() {
    wx.navigateTo({ url: "/pages/setup/index" });
  },

  goMeals() {
    wx.navigateTo({ url: "/pages/meals/index" });
  },

  goWeather() {
    wx.navigateTo({ url: "/pages/weather/index" });
  },

  goAssistant() {
    wx.navigateTo({ url: "/pages/assistant/index" });
  },

  goWater() {
    wx.navigateTo({ url: "/pages/water/index" });
  },

  goTodos() {
    wx.navigateTo({ url: "/pages/todos/index" });
  },

  goAnniversaries() {
    wx.navigateTo({ url: "/pages/anniversaries/index" });
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
