import axios, { AxiosError } from "axios";

interface ApiErrorBody {
  error?: string;
}

let authToken = "";

/** 设置后续请求统一携带的管理令牌，传空值表示匿名请求。 */
export function setAuthToken(token: string | null | undefined): void {
  authToken = token?.trim() || "";
}

export const http = axios.create({
  baseURL: "/api/v1/dashboard",
  timeout: 15000,
  headers: { "Cache-Control": "no-cache" },
});

http.interceptors.request.use((config) => {
  if (authToken) config.headers.set("Authorization", `Bearer ${authToken}`);
  return config;
});

export function apiError(error: unknown): Error {
  if (!(error instanceof AxiosError)) {
    return error instanceof Error ? error : new Error("数据查询失败");
  }
  const status = error.response?.status;
  if (status === 401) return new Error("访问令牌无效，请重新连接");
  if (status === 404)
    return new Error("查询接口未启用，请在后端设置 MONITOR_DASHBOARD_TOKEN");
  if (status === 502 || status === 503 || status === 504)
    return new Error("数据服务暂时不可用，请检查后端是否启动");
  if (!error.response)
    return new Error("无法连接数据服务，请检查后端地址和网络");
  const body = error.response.data as ApiErrorBody | undefined;
  return new Error(body?.error || `查询失败 (${status})`);
}
