import { requestApi } from "../../utils/request";

interface Expense {
  id: string;
  occurredOn: string;
  category: string;
  payer: "self" | "partner" | "both";
  amountCents: number;
  note: string | null;
}

interface ExpensesResponse {
  expenses: Expense[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

Page({
  data: {
    amountText: "",
    note: "",
    expenses: [] as Array<Expense & { amountText: string; categoryText: string }>,
    statusText: "记录共同支出"
  },

  onLoad() {
    void this.loadExpenses();
  },

  onShow() {
    void this.loadExpenses();
  },

  onAmountInput(event: { detail: { value: string } }) {
    this.setData({ amountText: event.detail.value });
  },

  onNoteInput(event: { detail: { value: string } }) {
    this.setData({ note: event.detail.value });
  },

  async createExpense() {
    const amount = Number(`${this.data.amountText ?? ""}`);
    if (!Number.isFinite(amount) || amount <= 0) {
      wx.showToast({ title: "金额不正确", icon: "none" });
      return;
    }

    const response = await requestApi("/api/expenses", {
      method: "POST",
      data: {
        occurredOn: today(),
        category: "takeout",
        payer: "both",
        amountCents: Math.round(amount * 100),
        note: `${this.data.note ?? ""}`.trim() || "共同支出"
      }
    });

    if (!response.ok) {
      wx.showToast({ title: "记账失败", icon: "none" });
      return;
    }

    this.setData({
      amountText: "",
      note: ""
    });
    void this.loadExpenses();
  },

  async loadExpenses() {
    const response = await requestApi<ExpensesResponse>("/api/expenses/recent");
    if (!response.ok || !response.data) {
      this.setData({ statusText: "未连接后端，请检查设置" });
      return;
    }

    this.setData({
      statusText: response.data.expenses.length > 0 ? "最近共同支出" : "暂无共同支出",
      expenses: response.data.expenses.map((expense) => ({
        ...expense,
        amountText: (expense.amountCents / 100).toFixed(2),
        categoryText: expense.category === "takeout" ? "外卖" : "共同支出"
      }))
    });
  }
});
