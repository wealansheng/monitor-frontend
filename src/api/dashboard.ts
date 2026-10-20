import type {
  MonitorApp,
  MonitorEventDetail,
  MonitorEventPage,
  Overview,
  SymbolicationResult,
} from "../types";
import { apiError, http } from "./http";

interface ApiResult {
  ok: boolean;
  error?: string;
}

/** 发送查询请求，校验统一的响应信封并转成调用方可读的错误。 */
async function get<T>(
  path: string,
  params?: Record<string, string | number>,
): Promise<T> {
  try {
    const response = await http.get<ApiResult & T>(path, { params });
    if (!response.data?.ok) {
      throw new Error(response.data?.error || "数据服务返回了无效响应");
    }
    return response.data;
  } catch (error) {
    throw apiError(error);
  }
}

export async function getApps(): Promise<MonitorApp[]> {
  const result = await get<{ apps: MonitorApp[] }>("/apps");
  return result.apps;
}

export function getOverview(appId: string, hours: number): Promise<Overview> {
  return get<Overview>("/overview", { app_id: appId, hours });
}

export function getEvents(
  params: Record<string, string | number>,
): Promise<MonitorEventPage> {
  return get<MonitorEventPage>("/events", params);
}

export function getEvent(
  params: Record<string, string | number>,
): Promise<MonitorEventDetail> {
  return get<MonitorEventDetail>("/event", params);
}

export function getSymbolication(appId: string, eventId: string): Promise<SymbolicationResult> {
  return get<SymbolicationResult>(`/errors/${encodeURIComponent(eventId)}/symbolication`, { app_id: appId });
}
