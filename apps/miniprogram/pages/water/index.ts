import { requestApi } from "../../utils/request";

interface WaterTodayResponse {
  water: {
    occurredOn: string;
    people: Array<{
      person: "self" | "partner";
      drinkCount: number;
      totalMl: number;
    }>;
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

Page({
  data: {
    statusText: "记录今天的喝水状态",
    selfText: "0 次 / 0 ml",
    partnerText: "0 次 / 0 ml"
  },

  onLoad() {
    void this.loadToday();
  },

  onShow() {
    void this.loadToday();
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

  async addSelfDrink() {
    await this.addDrink("self");
  },

  async addPartnerDrink() {
    await this.addDrink("partner");
  },

  async addDrink(person: "self" | "partner") {
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

    void this.loadToday();
  }
});
