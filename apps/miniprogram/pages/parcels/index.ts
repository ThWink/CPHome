import { requestApi } from "../../utils/request";

interface Parcel {
  id: string;
  title: string;
  pickupCode: string;
  location: string;
  owner: "self" | "partner" | "both";
  status: "pending" | "picked" | "canceled";
  note: string | null;
}

interface ParcelsResponse {
  parcels: Parcel[];
}

Page({
  data: {
    title: "",
    pickupCode: "",
    location: "",
    note: "",
    parcels: [] as Parcel[],
    statusText: "发布待取快递，方便对方顺手拿"
  },

  onLoad() {
    void this.loadParcels();
  },

  onShow() {
    void this.loadParcels();
  },

  onTitleInput(event: { detail: { value: string } }) {
    this.setData({ title: event.detail.value });
  },

  onPickupCodeInput(event: { detail: { value: string } }) {
    this.setData({ pickupCode: event.detail.value });
  },

  onLocationInput(event: { detail: { value: string } }) {
    this.setData({ location: event.detail.value });
  },

  onNoteInput(event: { detail: { value: string } }) {
    this.setData({ note: event.detail.value });
  },

  async loadParcels() {
    const response = await requestApi<ParcelsResponse>("/api/parcels/pending");
    if (!response.ok || !response.data) {
      this.setData({ statusText: "未连接后端，请检查设置" });
      return;
    }

    this.setData({
      parcels: response.data.parcels,
      statusText: response.data.parcels.length > 0 ? "这些快递待取" : "暂无待取快递"
    });
  },

  async createParcel() {
    const title = `${this.data.title ?? ""}`.trim();
    const pickupCode = `${this.data.pickupCode ?? ""}`.trim();
    const location = `${this.data.location ?? ""}`.trim();

    if (!title || !pickupCode || !location) {
      wx.showToast({ title: "先填完整信息", icon: "none" });
      return;
    }

    const response = await requestApi("/api/parcels", {
      method: "POST",
      data: {
        title,
        pickupCode,
        location,
        owner: "both",
        note: `${this.data.note ?? ""}`.trim() || null
      }
    });

    if (!response.ok) {
      wx.showToast({ title: "发布失败", icon: "none" });
      return;
    }

    this.setData({
      title: "",
      pickupCode: "",
      location: "",
      note: ""
    });
    void this.loadParcels();
  },

  async markPicked(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    const response = await requestApi(`/api/parcels/${id}/status`, {
      method: "PATCH",
      data: {
        status: "picked"
      }
    });

    if (!response.ok) {
      wx.showToast({ title: "更新失败", icon: "none" });
      return;
    }

    void this.loadParcels();
  }
});
