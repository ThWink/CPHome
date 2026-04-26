export interface ApiResponse<T> {
  ok: boolean;
  statusCode: number;
  data: T | null;
  error: string | null;
}

interface AppGlobals {
  globalData?: {
    defaultApiBaseUrl?: string;
  };
}

const apiBaseUrlKey = "apiBaseUrl";
const apiTokenKey = "apiToken";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const stored = wx.getStorageSync(apiBaseUrlKey);
  if (typeof stored === "string" && stored.trim().length > 0) {
    return trimTrailingSlash(stored.trim());
  }

  const app = getApp<AppGlobals>();
  return trimTrailingSlash(app.globalData?.defaultApiBaseUrl ?? "http://127.0.0.1:3000");
}

export function resolveApiUrl(value: string | null | undefined): string {
  const normalized = `${value ?? ""}`.trim();

  if (
    normalized.length === 0 ||
    /^(https?:|wxfile:|file:|data:|cloud:)/.test(normalized)
  ) {
    return normalized;
  }

  return normalized.startsWith("/")
    ? `${getApiBaseUrl()}${normalized}`
    : normalized;
}

export function setApiBaseUrl(value: string): string {
  const normalized = trimTrailingSlash(value.trim());
  wx.setStorageSync(apiBaseUrlKey, normalized);
  return normalized;
}

export function getApiToken(): string {
  const stored = wx.getStorageSync(apiTokenKey);
  return typeof stored === "string" ? stored.trim() : "";
}

export function setApiToken(value: string): string {
  const normalized = value.trim();
  wx.setStorageSync(apiTokenKey, normalized);
  return normalized;
}

export function requestApi<T>(
  path: string,
  options: { method?: string; data?: unknown; timeout?: number } = {}
): Promise<ApiResponse<T>> {
  const apiToken = getApiToken();

  return new Promise((resolve) => {
    wx.request({
      url: `${getApiBaseUrl()}${path}`,
      method: options.method ?? "GET",
      data: options.data,
      header: apiToken.length > 0 ? { "x-couple-api-token": apiToken } : {},
      timeout: options.timeout ?? 8000,
      success(response) {
        const ok = response.statusCode >= 200 && response.statusCode < 300;
        resolve({
          ok,
          statusCode: response.statusCode,
          data: ok ? response.data as T : null,
          error: ok ? null : JSON.stringify(response.data)
        });
      },
      fail(error) {
        resolve({
          ok: false,
          statusCode: 0,
          data: null,
          error: JSON.stringify(error)
        });
      }
    });
  });
}
