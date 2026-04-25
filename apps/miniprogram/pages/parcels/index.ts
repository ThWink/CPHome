import { requestApi } from "../../utils/request";

type ParcelOwner = "self" | "partner" | "both";

interface Parcel {
  id: string;
  title: string;
  pickupCode: string;
  location: string;
  owner: ParcelOwner;
  status: "pending" | "picked" | "canceled";
  note: string | null;
}

interface ParcelsResponse {
  parcels: Parcel[];
}

const ownerOptions: Array<{ value: ParcelOwner; label: string }> = [
  { value: "self", label: "我的" },
  { value: "partner", label: "对方的" },
  { value: "both", label: "共同的" }
];

const ownerLabels: Record<ParcelOwner, string> = {
  self: "我的",
  partner: "对方的",
  both: "共同的"
};

Page({
  data: {
    title: "",
    pickupCode: "",
    location: "",
    note: "",
    selectedOwner: "both" as ParcelOwner,
    ownerOptions,
    parcels: [] as Array<Parcel & { ownerText: string }>,
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

  selectOwner(event: { currentTarget: { dataset: { owner?: ParcelOwner } } }) {
    const owner = event.currentTarget.dataset.owner;
    if (owner) {
      this.setData({ selectedOwner: owner });
    }
  },

  async loadParcels() {
    const response = await requestApi<ParcelsResponse>("/api/parcels/pending");
    if (!response.ok || !response.data) {
      this.setData({ statusText: "未连接后端，请检查设置" });
      return;
    }

    this.setData({
      parcels: response.data.parcels.map((parcel) => ({
        ...parcel,
        ownerText: ownerLabels[parcel.owner]
      })),
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
        owner: this.data.selectedOwner,
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
      note: "",
      selectedOwner: "both"
    });
    await this.loadParcels();
  },

  async markPicked(event: { currentTarget: { dataset: { id?: string } } }) {
    await this.updateStatus(event.currentTarget.dataset.id, "picked");
  },

  async cancelParcel(event: { currentTarget: { dataset: { id?: string } } }) {
    await this.updateStatus(event.currentTarget.dataset.id, "canceled");
  },

  async updateStatus(id: string | undefined, status: "picked" | "canceled") {
    if (!id) {
      return;
    }

    const response = await requestApi(`/api/parcels/${id}/status`, {
      method: "PATCH",
      data: {
        status
      }
    });

    if (!response.ok) {
      wx.showToast({ title: "更新失败", icon: "none" });
      return;
    }

    await this.loadParcels();
  }
});
