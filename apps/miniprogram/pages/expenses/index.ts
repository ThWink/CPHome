import { requestApi } from "../../utils/request";

type ExpenseCategory =
  | "takeout"
  | "groceries"
  | "daily"
  | "rent"
  | "utilities"
  | "transport"
  | "entertainment"
  | "other";

type ExpensePayer = "self" | "partner" | "both";

interface Expense {
  id: string;
  occurredOn: string;
  category: ExpenseCategory;
  payer: ExpensePayer;
  amountCents: number;
  note: string | null;
}

interface ExpensesResponse {
  expenses: Expense[];
}

interface ExpenseSummaryResponse {
  summary: {
    month: string;
    totalCents: number;
    byCategory: Array<{
      category: ExpenseCategory;
      amountCents: number;
      count: number;
    }>;
    byPayer: Array<{
      payer: ExpensePayer;
      amountCents: number;
      count: number;
    }>;
  };
}

const categoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "takeout", label: "外卖" },
  { value: "groceries", label: "买菜" },
  { value: "daily", label: "日用" },
  { value: "rent", label: "房租" },
  { value: "utilities", label: "水电" },
  { value: "transport", label: "交通" },
  { value: "entertainment", label: "娱乐" },
  { value: "other", label: "其他" }
];

const payerOptions: Array<{ value: ExpensePayer; label: string }> = [
  { value: "both", label: "共同" },
  { value: "self", label: "我付" },
  { value: "partner", label: "对方付" }
];

const categoryLabels: Record<ExpenseCategory, string> = {
  takeout: "外卖",
  groceries: "买菜",
  daily: "日用",
  rent: "房租",
  utilities: "水电",
  transport: "交通",
  entertainment: "娱乐",
  other: "其他"
};

const payerLabels: Record<ExpensePayer, string> = {
  both: "共同",
  self: "我付",
  partner: "对方付"
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function currentMonth(): string {
  return today().slice(0, 7);
}

function formatMoney(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

Page({
  data: {
    amountText: "",
    note: "",
    selectedCategory: "takeout" as ExpenseCategory,
    selectedPayer: "both" as ExpensePayer,
    categoryOptions,
    payerOptions,
    month: currentMonth(),
    totalText: "0.00",
    categoryStats: [] as Array<{ label: string; amountText: string; countText: string }>,
    payerStats: [] as Array<{ label: string; amountText: string; countText: string }>,
    expenses: [] as Array<Expense & { amountText: string; categoryText: string; payerText: string }>,
    statusText: "记录共同支出"
  },

  onLoad() {
    void this.refreshAll();
  },

  onShow() {
    void this.refreshAll();
  },

  onAmountInput(event: { detail: { value: string } }) {
    this.setData({ amountText: event.detail.value });
  },

  onNoteInput(event: { detail: { value: string } }) {
    this.setData({ note: event.detail.value });
  },

  selectCategory(event: { currentTarget: { dataset: { category?: ExpenseCategory } } }) {
    const category = event.currentTarget.dataset.category;
    if (category) {
      this.setData({ selectedCategory: category });
    }
  },

  selectPayer(event: { currentTarget: { dataset: { payer?: ExpensePayer } } }) {
    const payer = event.currentTarget.dataset.payer;
    if (payer) {
      this.setData({ selectedPayer: payer });
    }
  },

  async refreshAll() {
    await Promise.all([this.loadSummary(), this.loadExpenses()]);
  },

  async createExpense() {
    const amount = Number(`${this.data.amountText ?? ""}`);
    if (!Number.isFinite(amount) || amount <= 0) {
      wx.showToast({ title: "金额不正确", icon: "none" });
      return;
    }

    const selectedCategory = this.data.selectedCategory as ExpenseCategory;
    const selectedPayer = this.data.selectedPayer as ExpensePayer;

    const response = await requestApi("/api/expenses", {
      method: "POST",
      data: {
        occurredOn: today(),
        category: selectedCategory,
        payer: selectedPayer,
        amountCents: Math.round(amount * 100),
        note: `${this.data.note ?? ""}`.trim() || categoryLabels[selectedCategory]
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
    await this.refreshAll();
  },

  async loadSummary() {
    const response = await requestApi<ExpenseSummaryResponse>(
      `/api/expenses/summary?month=${this.data.month}`
    );
    if (!response.ok || !response.data) {
      this.setData({
        statusText: "未连接后端，请检查设置"
      });
      return;
    }

    const summary = response.data.summary;
    this.setData({
      month: summary.month,
      totalText: formatMoney(summary.totalCents),
      categoryStats: summary.byCategory.map((item) => ({
        label: categoryLabels[item.category],
        amountText: formatMoney(item.amountCents),
        countText: `${item.count} 笔`
      })),
      payerStats: summary.byPayer.map((item) => ({
        label: payerLabels[item.payer],
        amountText: formatMoney(item.amountCents),
        countText: `${item.count} 笔`
      }))
    });
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
        amountText: formatMoney(expense.amountCents),
        categoryText: categoryLabels[expense.category],
        payerText: payerLabels[expense.payer]
      }))
    });
  }
});
