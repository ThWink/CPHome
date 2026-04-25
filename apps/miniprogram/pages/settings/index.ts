import {
  getApiBaseUrl,
  getApiToken,
  requestApi,
  setApiBaseUrl,
  setApiToken
} from "../../utils/request";

interface ReadyResponse {
  status: string;
  checks: {
    database: string;
  };
}

interface MealMemory {
  id: string;
  content: string;
  createdAt: string;
  meal: {
    occurredOn: string;
    vendorName: string;
    items: string[];
    note: string | null;
  };
}

interface MemoriesResponse {
  memories: MealMemory[];
}

interface TastePreference {
  id: string;
  person: "self" | "partner" | "both";
  category: string;
  value: string;
  sentiment: "like" | "dislike" | "avoid";
  weight: number;
  note: string | null;
}

interface PreferencesResponse {
  preferences: TastePreference[];
}

interface MemoryUpdateResponse {
  memory: MealMemory;
}

interface BackupExportResponse {
  backup: {
    version: number;
    exportedAt: string;
    tableCounts: Record<string, number>;
    tables: Record<string, unknown[]>;
  };
}

interface BackupImportResponse {
  imported: {
    version: number;
    importedAt: string;
    tableCounts: Record<string, number>;
  };
}

const sentimentLabels: Record<TastePreference["sentiment"], string> = {
  like: "喜欢",
  dislike: "少推荐",
  avoid: "避免"
};

Page({
  data: {
    apiBaseUrl: "",
    apiToken: "",
    healthText: "未检查",
    memoryText: "未加载",
    backupText: "还没有生成备份",
    restoreText: "未导入备份",
    backupImportText: "",
    restoreConfirmText: "",
    editingMemoryId: "",
    editingMemoryText: "",
    memories: [] as Array<MealMemory & { itemText: string }>,
    preferences: [] as Array<TastePreference & { sentimentText: string }>
  },

  onLoad() {
    this.setData({
      apiBaseUrl: getApiBaseUrl(),
      apiToken: getApiToken()
    });
  },

  onShow() {
    void this.loadMemoryData();
  },

  onApiInput(event: { detail: { value: string } }) {
    this.setData({ apiBaseUrl: event.detail.value });
  },

  onApiTokenInput(event: { detail: { value: string } }) {
    this.setData({ apiToken: event.detail.value });
  },

  saveApiBaseUrl() {
    const apiBaseUrl = setApiBaseUrl(`${this.data.apiBaseUrl ?? ""}`);
    this.setData({ apiBaseUrl });
    wx.showToast({ title: "已保存", icon: "success" });
  },

  saveApiToken() {
    const apiToken = setApiToken(`${this.data.apiToken ?? ""}`);
    this.setData({ apiToken });
    wx.showToast({ title: apiToken.length > 0 ? "Token 已保存" : "Token 已清空", icon: "success" });
  },

  async checkHealth() {
    const response = await requestApi<ReadyResponse>("/health/ready");
    this.setData({
      healthText: response.ok ? `后端正常，数据库 ${response.data?.checks.database}` : "后端未连接"
    });
  },

  async loadMemoryData() {
    const [memoriesResponse, preferencesResponse] = await Promise.all([
      requestApi<MemoriesResponse>("/api/meals/memories"),
      requestApi<PreferencesResponse>("/api/meals/preferences")
    ]);

    if (!memoriesResponse.ok || !memoriesResponse.data || !preferencesResponse.ok || !preferencesResponse.data) {
      this.setData({
        memoryText: memoriesResponse.statusCode === 401 || preferencesResponse.statusCode === 401
          ? "Token 未填写或不正确"
          : "记忆接口未连接"
      });
      return;
    }

    this.setData({
      memoryText: `${memoriesResponse.data.memories.length} 条饮食记忆，${preferencesResponse.data.preferences.length} 条偏好`,
      memories: memoriesResponse.data.memories.map((memory) => ({
        ...memory,
        itemText: `${memory.meal.vendorName} · ${memory.meal.items.join("、")}`
      })),
      preferences: preferencesResponse.data.preferences.map((preference) => ({
        ...preference,
        sentimentText: sentimentLabels[preference.sentiment]
      }))
    });
  },

  async deleteMemory(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    const response = await requestApi(`/api/meals/memories/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      wx.showToast({ title: response.statusCode === 401 ? "Token 不正确" : "删除失败", icon: "none" });
      return;
    }

    wx.showToast({ title: "已删除", icon: "success" });
    void this.loadMemoryData();
  },

  startEditMemory(event: { currentTarget: { dataset: { id?: string; content?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    this.setData({
      editingMemoryId: id,
      editingMemoryText: event.currentTarget.dataset.content ?? ""
    });
  },

  onMemoryEditInput(event: { detail: { value: string } }) {
    this.setData({
      editingMemoryText: event.detail.value
    });
  },

  cancelEditMemory() {
    this.setData({
      editingMemoryId: "",
      editingMemoryText: ""
    });
  },

  async saveMemory() {
    const id = `${this.data.editingMemoryId ?? ""}`.trim();
    const content = `${this.data.editingMemoryText ?? ""}`.trim();
    if (!id || content.length === 0) {
      wx.showToast({ title: "内容不能为空", icon: "none" });
      return;
    }

    const response = await requestApi<MemoryUpdateResponse>(`/api/meals/memories/${id}`, {
      method: "PATCH",
      data: {
        content
      }
    });

    if (!response.ok) {
      wx.showToast({ title: response.statusCode === 401 ? "Token 不正确" : "保存失败", icon: "none" });
      return;
    }

    this.setData({
      editingMemoryId: "",
      editingMemoryText: ""
    });
    wx.showToast({ title: "已保存", icon: "success" });
    void this.loadMemoryData();
  },

  async copyBackup() {
    const response = await requestApi<BackupExportResponse>("/api/backup/export");
    if (!response.ok || !response.data) {
      this.setData({
        backupText: response.statusCode === 401 ? "Token 未填写或不正确" : "备份接口未连接"
      });
      wx.showToast({ title: "备份失败", icon: "none" });
      return;
    }

    const backupText = JSON.stringify(response.data.backup, null, 2);
    const tableTotal = Object.values(response.data.backup.tableCounts)
      .reduce((sum, count) => sum + count, 0);

    wx.setClipboardData({
      data: backupText,
      success: () => {
        this.setData({
          backupText: `已复制 ${tableTotal} 条数据，导出时间 ${response.data?.backup.exportedAt ?? ""}`
        });
        wx.showToast({ title: "备份已复制", icon: "success" });
      },
      fail: () => {
        this.setData({ backupText: "备份已生成，但复制失败" });
        wx.showToast({ title: "复制失败", icon: "none" });
      }
    });
  },

  onBackupImportInput(event: { detail: { value: string } }) {
    this.setData({ backupImportText: event.detail.value });
  },

  onRestoreConfirmInput(event: { detail: { value: string } }) {
    this.setData({ restoreConfirmText: event.detail.value });
  },

  async restoreBackup() {
    const rawBackup = `${this.data.backupImportText ?? ""}`.trim();
    const confirm = `${this.data.restoreConfirmText ?? ""}`.trim();

    if (rawBackup.length === 0) {
      wx.showToast({ title: "请粘贴备份", icon: "none" });
      return;
    }

    if (confirm !== "RESTORE_LOCAL_DATA") {
      wx.showToast({ title: "确认口令不正确", icon: "none" });
      return;
    }

    let backup: unknown;
    try {
      backup = JSON.parse(rawBackup);
    } catch {
      wx.showToast({ title: "JSON 不正确", icon: "none" });
      return;
    }

    const response = await requestApi<BackupImportResponse>("/api/backup/import", {
      method: "POST",
      data: {
        confirm,
        backup
      }
    });

    if (!response.ok || !response.data) {
      this.setData({
        restoreText: response.statusCode === 401 ? "Token 未填写或不正确" : "恢复失败"
      });
      wx.showToast({ title: "恢复失败", icon: "none" });
      return;
    }

    const tableTotal = Object.values(response.data.imported.tableCounts)
      .reduce((sum, count) => sum + count, 0);

    this.setData({
      restoreText: `已恢复 ${tableTotal} 条数据，导入时间 ${response.data.imported.importedAt}`,
      backupImportText: "",
      restoreConfirmText: ""
    });
    wx.showToast({ title: "已恢复", icon: "success" });
    void this.loadMemoryData();
  }
});
