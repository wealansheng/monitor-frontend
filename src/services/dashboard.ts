import { getApps, getEvent, getEvents, getOverview, getSymbolication } from "../api/dashboard";
import { demoApps, makeDemo } from "../data/demo";
import type {
  EventCategory,
  EventTypeKey,
  MonitorApp,
  MonitorEvent,
  MonitorEventDetail,
  MonitorEventPage,
  Overview,
} from "../types";

export const DEFAULT_APP_ID = "web-portal";
export const DEFAULT_HOURS = 24;
export const EVENT_PAGE_SIZE = 50;

export interface Workspace {
  apps: MonitorApp[];
  appId: string;
  overview: Overview | null;
}

export interface EventPageQuery {
  appId: string;
  hours: number;
  eventType?: EventTypeKey;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface EventDetailQuery {
  appId: string;
  eventId: string;
  eventType?: EventTypeKey;
}

export function loadSymbolication(appId: string, eventId: string) {
  return getSymbolication(appId, eventId);
}

/** 演示数据源：不访问后端，用于界面预览。 */
export function listDemoApps(): MonitorApp[] {
  return demoApps;
}

export function loadDemoOverview(
  appId = DEFAULT_APP_ID,
  hours = DEFAULT_HOURS,
): Overview {
  return makeDemo(appId, hours);
}

/** 优先沿用当前应用，否则回退到后端返回的第一个应用。 */
export function pickAppId(apps: MonitorApp[], preferredApp?: string): string {
  return (
    apps.find((item) => item.appId === preferredApp)?.appId ||
    apps[0]?.appId ||
    ""
  );
}

export function loadOverview(appId: string, hours: number): Promise<Overview> {
  return getOverview(appId, hours);
}

/** 真实数据源：读取应用列表并为选中应用拉取聚合指标。 */
export async function loadWorkspace(
  preferredApp: string | undefined,
  hours: number,
): Promise<Workspace> {
  const apps = await getApps();
  const appId = pickAppId(apps, preferredApp);
  const overview = appId ? await getOverview(appId, hours) : null;
  return { apps, appId, overview };
}

/** 事件明细：筛选与分页都在服务端完成。 */
export function loadEventPage({
  appId,
  hours,
  eventType,
  keyword,
  limit = EVENT_PAGE_SIZE,
  offset = 0,
}: EventPageQuery): Promise<MonitorEventPage> {
  const params: Record<string, string | number> = {
    app_id: appId,
    hours,
    limit,
    offset,
  };
  if (eventType) params.event_type = eventType;
  if (keyword) params.keyword = keyword;
  return getEvents(params);
}

function matchesEvent(
  event: MonitorEvent,
  { eventType, keyword }: Pick<EventPageQuery, "eventType" | "keyword">,
): boolean {
  if (eventType && event.eventType !== eventType) return false;
  const needle = keyword?.trim().toLowerCase();
  if (!needle) return true;
  return `${event.label} ${event.route} ${event.detail}`
    .toLowerCase()
    .includes(needle);
}

/** 演示数据源：与后端一致的过滤语义，但只在本地样本上执行。 */
export function loadDemoEventPage({
  appId,
  hours,
  eventType,
  keyword,
  limit = EVENT_PAGE_SIZE,
  offset = 0,
}: EventPageQuery): MonitorEventPage {
  const matched = loadDemoOverview(appId, hours).recentEvents.filter((event) =>
    matchesEvent(event, { eventType, keyword }),
  );
  const events = matched.slice(offset, offset + limit);
  return {
    events,
    total: matched.length,
    limit,
    offset,
    hasMore: offset + events.length < matched.length,
  };
}

export function categoryOfEventType(eventType: string): EventCategory {
  if (eventType === "error" || eventType === "stability") return "error";
  if (eventType === "behavior") return "behavior";
  return "performance";
}

/** 单条事件详情：由后端按其所属表返回完整字段。 */
export function loadEventDetail({
  appId,
  eventId,
  eventType,
}: EventDetailQuery): Promise<MonitorEventDetail> {
  const params: Record<string, string | number> = {
    app_id: appId,
    event_id: eventId,
  };
  if (eventType) params.event_type = eventType;
  return getEvent(params);
}

/** 演示数据源：只暴露演示样本里真实存在的字段，不编造堆栈等细节。 */
export function loadDemoEventDetail({
  appId,
  eventId,
  hours = DEFAULT_HOURS,
}: {
  appId: string;
  eventId: string;
  hours?: number;
}): MonitorEventDetail {
  const event = loadDemoOverview(appId, hours).recentEvents.find(
    (item) => item.eventId === eventId,
  );
  if (!event) throw new Error("演示数据中没有这条事件");
  const category = categoryOfEventType(event.eventType);
  return {
    appId,
    eventId,
    category,
    event: demoEventFields(event, appId, category),
  };
}

function demoEventFields(
  event: MonitorEvent,
  appId: string,
  category: EventCategory,
): Record<string, unknown> {
  const base = {
    event_id: event.eventId,
    event_type: event.eventType,
    timestamp: event.timestamp,
    app_id: appId,
    route: event.route,
  };
  if (category === "error") {
    return { ...base, message: event.label, error_type: event.detail };
  }
  if (category === "behavior") {
    return { ...base, action: event.label, category: event.detail };
  }
  return { ...base, metric_name: event.label, rating: event.detail };
}
