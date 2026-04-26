import { requestApi, resolveApiUrl } from "../../utils/request";

type ParcelOwner = "self" | "partner" | "both";

interface Parcel {
  id: string;
  title: string;
  pickupCode: string;
  location: string;
  owner: ParcelOwner;
  status: "pending" | "picked" | "canceled";
  note: string | null;
  imagePath: string | null;
}

interface ParcelsResponse {
  parcels: Parcel[];
}

interface ParcelImageResponse {
  image: {
    imagePath: string;
  };
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

function inferImageMediaType(filePath: string): "image/jpeg" | "image/png" | "image/webp" {
  const normalized = (filePath.split("?")[0] ?? filePath).toLowerCase();
  if (normalized.endsWith(".png")) {
    return "image/png";
  }

  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

function readFileAsBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: "base64",
      success: (response) => {
        if (typeof response.data === "string") {
          resolve(response.data);
          return;
        }

        reject(new Error("image data is not base64"));
      },
      fail: reject
    });
  });
}

Page({
  data: {
    title: "",
    pickupCode: "",
    location: "",
    note: "",
    parcelImageLocalPath: "",
    selectedOwner: "both" as ParcelOwner,
    ownerOptions,
    parcels: [] as Array<Parcel & { ownerText: string; imageUrl: string }>,
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

  chooseParcelImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (response) => {
        const tempFilePath = response.tempFilePaths[0];
        if (!tempFilePath) {
          return;
        }

        this.setData({
          parcelImageLocalPath: tempFilePath,
          statusText: "截图已放好，发布时会上传给后端"
        });
      },
      fail: () => {
        wx.showToast({ title: "未选择截图", icon: "none" });
      }
    });
  },

  clearParcelImage() {
    this.setData({ parcelImageLocalPath: "" });
  },

  previewSelectedImage() {
    const imagePath = `${this.data.parcelImageLocalPath ?? ""}`.trim();
    if (imagePath) {
      wx.previewImage({ current: imagePath, urls: [imagePath] });
    }
  },

  previewParcelImage(event: { currentTarget: { dataset: { image?: string } } }) {
    const imagePath = event.currentTarget.dataset.image;
    if (imagePath) {
      wx.previewImage({ current: imagePath, urls: [imagePath] });
    }
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
        ownerText: ownerLabels[parcel.owner],
        imageUrl: resolveApiUrl(parcel.imagePath)
      })),
      statusText: response.data.parcels.length > 0 ? "这些快递待取" : "暂无待取快递"
    });
  },

  async uploadParcelImage(localPath: string): Promise<string | null> {
    if (!localPath) {
      return null;
    }

    const response = await requestApi<ParcelImageResponse>("/api/parcels/images", {
      method: "POST",
      data: {
        mediaType: inferImageMediaType(localPath),
        dataBase64: await readFileAsBase64(localPath)
      }
    });

    if (!response.ok || !response.data) {
      wx.showToast({ title: "截图上传失败", icon: "none" });
      throw new Error(response.error ?? "parcel image upload failed");
    }

    return response.data.image.imagePath;
  },

  async createParcel() {
    const title = `${this.data.title ?? ""}`.trim();
    const pickupCode = `${this.data.pickupCode ?? ""}`.trim();
    const location = `${this.data.location ?? ""}`.trim();
    const localImagePath = `${this.data.parcelImageLocalPath ?? ""}`.trim();

    if (!localImagePath && (!title || !pickupCode || !location)) {
      wx.showToast({ title: "填完整信息或上传截图", icon: "none" });
      return;
    }

    let imagePath: string | null;
    try {
      imagePath = await this.uploadParcelImage(localImagePath);
    } catch {
      return;
    }

    const response = await requestApi("/api/parcels", {
      method: "POST",
      data: {
        title: title || "截图快递",
        pickupCode: pickupCode || "见截图",
        location: location || "见截图",
        owner: this.data.selectedOwner,
        note: `${this.data.note ?? ""}`.trim() || null,
        imagePath: imagePath || null
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
      parcelImageLocalPath: "",
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
