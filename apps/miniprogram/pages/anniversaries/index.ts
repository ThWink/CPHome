import { requestApi } from "../../utils/request";

interface UpcomingAnniversary {
  id: string;
  title: string;
  date: string;
  repeat: "none" | "yearly";
  remindDaysBefore: number;
  nextOn: string;
  daysLeft: number;
}

interface AnniversariesResponse {
  anniversaries: UpcomingAnniversary[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

Page({
  data: {
    title: "",
    date: today(),
    remindDaysBeforeText: "7",
    anniversaries: [] as UpcomingAnniversary[],
    statusText: "记录重要日子，提前提醒彼此"
  },

  onLoad() {
    void this.loadAnniversaries();
  },

  onShow() {
    void this.loadAnniversaries();
  },

  onTitleInput(event: { detail: { value: string } }) {
    this.setData({ title: event.detail.value });
  },

  onDateInput(event: { detail: { value: string } }) {
    this.setData({ date: event.detail.value });
  },

  onRemindInput(event: { detail: { value: string } }) {
    this.setData({ remindDaysBeforeText: event.detail.value });
  },

  async loadAnniversaries() {
    const response = await requestApi<AnniversariesResponse>(`/api/anniversaries/upcoming?date=${today()}`);
    if (!response.ok || !response.data) {
      this.setData({ statusText: "未连接后端，请检查设置" });
      return;
    }

    this.setData({
      anniversaries: response.data.anniversaries,
      statusText: response.data.anniversaries.length > 0 ? "最近的重要日子" : "还没有纪念日"
    });
  },

  async createAnniversary() {
    const title = `${this.data.title ?? ""}`.trim();
    const date = `${this.data.date ?? ""}`.trim();
    const remindDaysBefore = Number(`${this.data.remindDaysBeforeText ?? "0"}`);

    if (!title || !date) {
      wx.showToast({ title: "先填完整信息", icon: "none" });
      return;
    }

    if (!Number.isInteger(remindDaysBefore) || remindDaysBefore < 0 || remindDaysBefore > 30) {
      wx.showToast({ title: "提醒天数 0-30", icon: "none" });
      return;
    }

    const response = await requestApi("/api/anniversaries", {
      method: "POST",
      data: {
        title,
        date,
        repeat: "yearly",
        remindDaysBefore
      }
    });

    if (!response.ok) {
      wx.showToast({ title: "保存失败", icon: "none" });
      return;
    }

    this.setData({
      title: "",
      date: today(),
      remindDaysBeforeText: "7"
    });
    void this.loadAnniversaries();
  }
});
