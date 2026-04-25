import { requestApi } from "../../utils/request";

type CouplePerson = "self" | "partner";

interface WaterTodayResponse {
  water: {
    occurredOn: string;
    people: Array<{
      person: CouplePerson;
      drinkCount: number;
      totalMl: number;
    }>;
  };
}

interface WaterReminder {
  id: string;
  fromPerson: CouplePerson;
  targetPerson: CouplePerson;
  remindOn: string;
  message: string | null;
  status: "pending" | "done";
}

interface WaterRemindersResponse {
  reminders: WaterReminder[];
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const personLabels: Record<CouplePerson, string> = {
  self: "我",
  partner: "对方"
};

Page({
  data: {
    statusText: "记录今天的喝水状态",
    selfText: "0 次 / 0 ml",
    partnerText: "0 次 / 0 ml",
    reminders: [] as Array<WaterReminder & { targetText: string; fromText: string }>,
    reminderStatusText: "暂无待处理提醒"
  },

  onLoad() {
    void this.refreshAll();
  },

  onShow() {
    void this.refreshAll();
  },

  async refreshAll() {
    await Promise.all([this.loadToday(), this.loadReminders()]);
  },

  async loadToday() {
    const response = await requestApi<WaterTodayResponse>(`/api/water/today?date=${today()}`);
    if (!response.ok || !response.data) {
      this.setData({ statusText: "未连接后端，请检查设置" });
      return;
    }

    const self = response.data.water.people.find((item) => item.person === "self");
    const partner = response.data.water.people.find((item) => item.person === "partner");

    this.setData({
      statusText: `今日 ${response.data.water.occurredOn}`,
      selfText: `${self?.drinkCount ?? 0} 次 / ${self?.totalMl ?? 0} ml`,
      partnerText: `${partner?.drinkCount ?? 0} 次 / ${partner?.totalMl ?? 0} ml`
    });
  },

  async loadReminders() {
    const response = await requestApi<WaterRemindersResponse>(`/api/water/reminders/pending?date=${today()}`);
    if (!response.ok || !response.data) {
      this.setData({ reminderStatusText: "未连接提醒服务" });
      return;
    }

    this.setData({
      reminderStatusText: response.data.reminders.length > 0
        ? `还有 ${response.data.reminders.length} 个喝水提醒`
        : "暂无待处理提醒",
      reminders: response.data.reminders.map((reminder) => ({
        ...reminder,
        targetText: personLabels[reminder.targetPerson],
        fromText: personLabels[reminder.fromPerson]
      }))
    });
  },

  async addSelfDrink() {
    await this.addDrink("self");
  },

  async addPartnerDrink() {
    await this.addDrink("partner");
  },

  async addDrink(person: CouplePerson) {
    const response = await requestApi("/api/water/drinks", {
      method: "POST",
      data: {
        person,
        occurredOn: today(),
        amountMl: 250
      }
    });

    if (!response.ok) {
      wx.showToast({ title: "记录失败", icon: "none" });
      return;
    }

    await this.refreshAll();
  },

  async remindPartner() {
    await this.createReminder("partner", "喝点水，别忙忘啦");
  },

  async remindSelf() {
    await this.createReminder("self", "休息一下，喝杯水");
  },

  async createReminder(targetPerson: CouplePerson, message: string) {
    const response = await requestApi("/api/water/reminders", {
      method: "POST",
      data: {
        fromPerson: "self",
        targetPerson,
        remindOn: today(),
        message
      }
    });

    if (!response.ok) {
      wx.showToast({ title: "提醒失败", icon: "none" });
      return;
    }

    wx.showToast({ title: "已加入提醒", icon: "success" });
    await this.loadReminders();
  },

  async completeReminder(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    const response = await requestApi(`/api/water/reminders/${id}/status`, {
      method: "PATCH",
      data: {
        status: "done"
      }
    });

    if (!response.ok) {
      wx.showToast({ title: "操作失败", icon: "none" });
      return;
    }

    await this.loadReminders();
  }
});
