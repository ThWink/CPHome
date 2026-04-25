import { requestApi } from "../../utils/request";

interface WeatherResponse {
  weather: {
    city: string;
    condition: string;
    temperatureC: number;
    advice: string;
    updatedAt: string;
    source?: "online" | "local";
  };
}

function formatUpdatedAt(value: string): string {
  if (!value) {
    return "";
  }

  return value.replace("T", " ").slice(0, 16);
}

Page({
  data: {
    city: "南昌",
    weatherText: "正在获取天气",
    sourceText: "天气服务准备中",
    updatedText: "",
    advice: "会优先使用在线天气 API，网络不可用时自动切回本地兜底数据。"
  },

  onLoad() {
    void this.loadWeather();
  },

  onCityInput(event: { detail: { value: string } }) {
    this.setData({ city: event.detail.value });
  },

  async loadWeather() {
    const city = `${this.data.city ?? "南昌"}`.trim() || "南昌";
    this.setData({ weatherText: "正在刷新天气", sourceText: "连接天气服务中" });

    const response = await requestApi<WeatherResponse>(`/api/weather/today?city=${encodeURIComponent(city)}`);

    if (!response.ok || !response.data) {
      this.setData({
        weatherText: "未连接后端",
        sourceText: "请先检查设置里的后端地址",
        updatedText: "",
        advice: "后端连上后，这里会显示在线天气和适合今天的外卖、出门建议。"
      });
      return;
    }

    const weather = response.data.weather;
    this.setData({
      city: weather.city,
      weatherText: `${weather.city} · ${weather.condition} · ${weather.temperatureC}℃`,
      sourceText: weather.source === "online" ? "在线天气" : "本地兜底",
      updatedText: formatUpdatedAt(weather.updatedAt),
      advice: weather.advice
    });
  }
});
