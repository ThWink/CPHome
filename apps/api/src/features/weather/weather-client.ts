import type { WeatherToday } from "@couple-life/shared";
import type { AppEnv } from "../../config/env.js";

export interface WeatherClient {
  getToday(city: unknown): Promise<WeatherToday>;
}

interface OpenMeteoOptions {
  defaultCity: string;
  fetcher?: typeof fetch;
}

interface GeocodingResponse {
  results?: Array<{
    name?: string;
    country?: string;
    admin1?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

interface ForecastResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
  };
}

function normalizeCity(city: unknown, defaultCity: string): string {
  const value = typeof city === "string" ? city.trim() : "";
  if (value.length === 0 || value === "本地") {
    return defaultCity;
  }

  return value.slice(0, 40);
}

async function readJson<T>(url: URL, fetcher: typeof fetch): Promise<T> {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`weather upstream returned HTTP ${response.status}`);
  }

  return await response.json() as T;
}

function weatherCodeToCondition(code: number): string {
  if (code === 0) {
    return "晴";
  }

  if (code === 1 || code === 2) {
    return "少云";
  }

  if (code === 3) {
    return "阴";
  }

  if (code === 45 || code === 48) {
    return "有雾";
  }

  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return "有雨";
  }

  if (code >= 71 && code <= 77) {
    return "有雪";
  }

  if (code >= 95) {
    return "雷阵雨";
  }

  return "多云";
}

function buildWeatherAdvice(temperatureC: number, condition: string): string {
  const parts: string[] = [];

  if (condition.includes("雨")) {
    parts.push("出门取快递记得带伞，外卖优先选汤面、粥或热饭。");
  } else if (condition.includes("雪")) {
    parts.push("路面可能滑，尽量少跑远路，点热乎一点的外卖。");
  } else {
    parts.push("天气还算稳定，可以按平常节奏安排外卖、取件和出门。");
  }

  if (temperatureC >= 30) {
    parts.push("今天偏热，适合清爽一点，少选太油腻。");
  } else if (temperatureC <= 10) {
    parts.push("今天偏冷，适合热汤、煲仔饭或麻辣烫这类暖一点的选择。");
  } else {
    parts.push("温度适中，纠结吃什么时可以让转盘从常吃店里选。");
  }

  return parts.join("");
}

function createOpenMeteoWeatherClient(options: OpenMeteoOptions): WeatherClient {
  const fetcher = options.fetcher ?? fetch;

  return {
    async getToday(cityInput: unknown): Promise<WeatherToday> {
      const city = normalizeCity(cityInput, options.defaultCity);
      const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geocodingUrl.searchParams.set("name", city);
      geocodingUrl.searchParams.set("count", "1");
      geocodingUrl.searchParams.set("language", "zh");
      geocodingUrl.searchParams.set("format", "json");

      const geocoding = await readJson<GeocodingResponse>(geocodingUrl, fetcher);
      const location = geocoding.results?.[0];
      if (
        location?.latitude === undefined ||
        location.longitude === undefined
      ) {
        throw new Error(`weather city not found: ${city}`);
      }

      const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
      forecastUrl.searchParams.set("latitude", String(location.latitude));
      forecastUrl.searchParams.set("longitude", String(location.longitude));
      forecastUrl.searchParams.set("current", "temperature_2m,weather_code");
      forecastUrl.searchParams.set("timezone", "auto");

      const forecast = await readJson<ForecastResponse>(forecastUrl, fetcher);
      const temperatureC = Math.round(Number(forecast.current?.temperature_2m));
      const weatherCode = Number(forecast.current?.weather_code);
      if (!Number.isFinite(temperatureC) || !Number.isFinite(weatherCode)) {
        throw new Error("weather forecast response is incomplete");
      }

      const condition = weatherCodeToCondition(weatherCode);
      const displayCity = [location.name, location.admin1]
        .filter((item): item is string => typeof item === "string" && item.length > 0)
        .join(" · ");

      return {
        city: displayCity || city,
        condition,
        temperatureC,
        advice: buildWeatherAdvice(temperatureC, condition),
        updatedAt: forecast.current?.time ?? new Date().toISOString(),
        source: "online"
      };
    }
  };
}

export function createWeatherClient(env: AppEnv): WeatherClient | null {
  if (env.WEATHER_PROVIDER === "disabled") {
    return null;
  }

  return createOpenMeteoWeatherClient({
    defaultCity: env.WEATHER_DEFAULT_CITY
  });
}
