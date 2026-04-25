import { requestApi } from "../../utils/request";

type AnniversaryRepeat = "none" | "yearly";

interface UpcomingAnniversary {
  id: string;
  title: string;
  date: string;
  repeat: AnniversaryRepeat;
  remindDaysBefore: number;
  nextOn: string;
  daysLeft: number;
}

interface AnniversariesResponse {
  anniversaries: UpcomingAnniversary[];
}

const repeatOptions: Array<{ value: AnniversaryRepeat; label: string }> = [
  { value: "yearly", label: "每年提醒" },
  { value: "none", label: "只提醒一次" }
];

const repeatLabels: Record<AnniversaryRepeat, string> = {
  yearly: "每年",
  none: "一次"
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

Page({
  data: {
    title: "",
    date: today(),
    selectedRepeat: "yearly" as AnniversaryRepeat,
    repeatOptions,
    remindDaysBeforeText: "7",
    anniversaries: [] as Array<UpcomingAnniversary & { repeatText: string }>,
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

  onDateChange(event: { detail: { value: string } }) {
    this.setData({ date: event.detail.value });
  },

  selectRepeat(event: { currentTarget: { dataset: { repeat?: AnniversaryRepeat } } }) {
    const repeat = event.currentTarget.dataset.repeat;
    if (repeat) {
      this.setData({ selectedRepeat: repeat });
    }
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
      anniversaries: response.data.anniversaries.map((anniversary) => ({
        ...anniversary,
        repeatText: repeatLabels[anniversary.repeat]
      })),
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
        repeat: this.data.selectedRepeat,
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
      selectedRepeat: "yearly",
      remindDaysBeforeText: "7"
    });
    await this.loadAnniversaries();
  }
});
