import { requestApi } from "../../utils/request";

interface WeatherResponse {
  weather: {
    city: string;
    condition: string;
    temperatureC: number;
    advice: string;
    updatedAt: string;
  };
}

Page({
  data: {
    city: "本地",
    weatherText: "正在看天气",
    advice: "天气服务会先使用本地模拟数据，后续可替换为在线天气 API 或 MCP 工具。"
  },

  onLoad() {
    void this.loadWeather();
  },

  onCityInput(event: { detail: { value: string } }) {
    this.setData({ city: event.detail.value });
  },

  async loadWeather() {
    const city = `${this.data.city ?? "本地"}`.trim() || "本地";
    const response = await requestApi<WeatherResponse>(`/api/weather/today?city=${encodeURIComponent(city)}`);

    if (!response.ok || !response.data) {
      this.setData({
        weatherText: "未连接后端",
        advice: "先去设置页确认后端地址。"
      });
      return;
    }

    const weather = response.data.weather;
    this.setData({
      city: weather.city,
      weatherText: `${weather.city} · ${weather.condition} · ${weather.temperatureC}℃`,
      advice: weather.advice
    });
  }
});
