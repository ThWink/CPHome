import { requestApi } from "../../utils/request";

interface Todo {
  id: string;
  title: string;
  assignee: "self" | "partner" | "both";
  dueOn: string | null;
  status: "open" | "done";
}

interface TodosResponse {
  todos: Todo[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

Page({
  data: {
    title: "",
    dueOn: today(),
    todos: [] as Todo[],
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

  onDueOnInput(event: { detail: { value: string } }) {
    this.setData({ dueOn: event.detail.value });
  },

  async loadTodos() {
    const response = await requestApi<TodosResponse>("/api/todos/open");
    if (!response.ok || !response.data) {
      this.setData({ statusText: "未连接后端，请检查设置" });
      return;
    }

    this.setData({
      todos: response.data.todos,
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
        assignee: "both",
        dueOn: dueOn || null
      }
    });

    if (!response.ok) {
      wx.showToast({ title: "创建失败", icon: "none" });
      return;
    }

    this.setData({
      title: "",
      dueOn: today()
    });
    void this.loadTodos();
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

    void this.loadTodos();
  }
});
