declare function App(options: Record<string, unknown>): void;
declare function Page(options: Record<string, unknown>): void;
declare function getApp<T = { globalData?: Record<string, unknown> }>(): T;

declare const wx: {
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  request(options: {
    url: string;
    method?: string;
    data?: unknown;
    timeout?: number;
    success?: (response: { statusCode: number; data: unknown }) => void;
    fail?: (error: unknown) => void;
  }): void;
  showToast(options: { title: string; icon?: "success" | "error" | "loading" | "none" }): void;
  navigateTo(options: { url: string }): void;
};
