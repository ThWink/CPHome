import { requestApi } from "../../utils/request";

interface SetupStatusResponse {
  configured: boolean;
  coupleName: string | null;
  memberCount: number;
}

interface InitializeCoupleResponse {
  coupleId: string;
  selfUserId: string;
  partnerUserId: string;
  inviteCode: string;
}

Page({
  data: {
    loading: false,
    configured: false,
    statusText: "检查绑定状态",
    coupleName: "两人小家",
    selfName: "",
    partnerName: "",
    inviteCode: ""
  },

  onLoad() {
    void this.loadSetupStatus();
  },

  async loadSetupStatus() {
    const response = await requestApi<SetupStatusResponse>("/api/setup/status");
    if (!response.ok || !response.data) {
      this.setData({
        configured: false,
        statusText: "未连接后端，请先在设置里确认后端地址"
      });
      return;
    }

    const status = response.data;
    this.setData({
      configured: status.configured,
      statusText: status.configured
        ? `已绑定 ${status.coupleName ?? "两人小家"}，当前 ${status.memberCount} 人`
        : "这个部署实例还没绑定情侣"
    });
  },

  onCoupleNameInput(event: { detail: { value: string } }) {
    this.setData({ coupleName: event.detail.value });
  },

  onSelfNameInput(event: { detail: { value: string } }) {
    this.setData({ selfName: event.detail.value });
  },

  onPartnerNameInput(event: { detail: { value: string } }) {
    this.setData({ partnerName: event.detail.value });
  },

  async initializeCouple() {
    const coupleName = `${this.data.coupleName ?? ""}`.trim();
    const selfName = `${this.data.selfName ?? ""}`.trim();
    const partnerName = `${this.data.partnerName ?? ""}`.trim();

    if (!coupleName || !selfName || !partnerName) {
      wx.showToast({ title: "先填完整信息", icon: "none" });
      return;
    }

    this.setData({ loading: true, statusText: "正在绑定" });
    const response = await requestApi<InitializeCoupleResponse>("/api/setup/initialize", {
      method: "POST",
      data: {
        coupleName,
        selfName,
        partnerName
      }
    });

    if (!response.ok || !response.data) {
      this.setData({
        loading: false,
        statusText: response.statusCode === 409 ? "这个部署实例已经绑定过了" : "绑定失败，请检查后端地址"
      });
      return;
    }

    this.setData({
      loading: false,
      configured: true,
      inviteCode: response.data.inviteCode,
      statusText: "已完成绑定"
    });

    wx.showToast({ title: "绑定成功", icon: "success" });
  },

  goSettings() {
    wx.navigateTo({ url: "/pages/settings/index" });
  }
});
