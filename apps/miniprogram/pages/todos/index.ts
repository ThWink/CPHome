import { requestApi } from "../../utils/request";

type Assignee = "self" | "partner" | "both";

interface Todo {
  id: string;
  title: string;
  assignee: Assignee;
  dueOn: string | null;
  status: "open" | "done";
}

interface TodosResponse {
  todos: Todo[];
}

const assigneeOptions: Array<{ value: Assignee; label: string }> = [
  { value: "both", label: "共同" },
  { value: "self", label: "我" },
  { value: "partner", label: "对方" }
];

const assigneeLabels: Record<Assignee, string> = {
  both: "共同",
  self: "我",
  partner: "对方"
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
    dueOn: today(),
    selectedAssignee: "both" as Assignee,
    assigneeOptions,
    todos: [] as Array<Todo & { assigneeText: string }>,
    statusText: "把今天要互相照应的事放在这里"
  },

  onLoad() {
    void this.loadTodos();
  },

  onShow() {
    void this.loadTodos();
  },

  onTitleInput(event: { detail: { value: string } }) {
    this.setData({ title: event.detail.value });
  },

  onDueOnChange(event: { detail: { value: string } }) {
    this.setData({ dueOn: event.detail.value });
  },

  selectAssignee(event: { currentTarget: { dataset: { assignee?: Assignee } } }) {
    const assignee = event.currentTarget.dataset.assignee;
    if (assignee) {
      this.setData({ selectedAssignee: assignee });
    }
  },

  async loadTodos() {
    const response = await requestApi<TodosResponse>("/api/todos/open");
    if (!response.ok || !response.data) {
      this.setData({ statusText: "未连接后端，请检查设置" });
      return;
    }

    this.setData({
      todos: response.data.todos.map((todo) => ({
        ...todo,
        assigneeText: assigneeLabels[todo.assignee]
      })),
      statusText: response.data.todos.length > 0 ? "这些事还没完成" : "今天暂时没有待办"
    });
  },

  async createTodo() {
    const title = `${this.data.title ?? ""}`.trim();
    const dueOn = `${this.data.dueOn ?? ""}`.trim();

    if (!title) {
      wx.showToast({ title: "先写待办内容", icon: "none" });
      return;
    }

    const response = await requestApi("/api/todos", {
      method: "POST",
      data: {
        title,
        assignee: this.data.selectedAssignee,
        dueOn: dueOn || null
      }
    });

    if (!response.ok) {
      wx.showToast({ title: "创建失败", icon: "none" });
      return;
    }

    this.setData({
      title: "",
      dueOn: today(),
      selectedAssignee: "both"
    });
    await this.loadTodos();
  },

  async markDone(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    const response = await requestApi(`/api/todos/${id}/status`, {
      method: "PATCH",
      data: {
        status: "done"
      }
    });

    if (!response.ok) {
      wx.showToast({ title: "更新失败", icon: "none" });
      return;
    }

    await this.loadTodos();
  }
});
