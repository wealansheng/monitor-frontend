import { ref } from "vue";
import {
  EVENT_PAGE_SIZE,
  loadDemoEventPage,
  loadEventPage,
} from "../services/dashboard";
import type { EventTypeFilter, MonitorEvent } from "../types";
import { useDashboardStore } from "./dashboard";

export const EVENT_TYPE_FILTERS: readonly EventTypeFilter[] = [
  "all",
  "error",
  "stability",
  "performance",
  "request",
  "resource",
  "behavior",
];

const dashboard = useDashboardStore();

const eventType = ref<EventTypeFilter>("all");
const keyword = ref("");
const events = ref<MonitorEvent[]>([]);
const total = ref(0);
const hasMore = ref(false);
const loading = ref(false);
const loadError = ref("");
/** 列表滚动位置：离开详情页再回来时恢复。 */
const scrollTop = ref(0);
const lastLoadedAt = ref(0);

let requestSequence = 0;
let active = false;
/** 筛选或数据源变化后置脏，下次进入列表页时重新查询第一页。 */
let stale = true;

/** 查询第一页（reset）或追加下一页；筛选与分页都交给服务端。 */
async function loadPage(reset: boolean): Promise<void> {
  const appId = dashboard.appId.value;
  if (!appId) {
    events.value = [];
    total.value = 0;
    hasMore.value = false;
    stale = false;
    return;
  }

  const offset = reset ? 0 : events.value.length;
  const sequence = ++requestSequence;
  if (reset) scrollTop.value = 0;
  loading.value = true;
  loadError.value = "";
  try {
    const query = {
      appId,
      hours: dashboard.hours.value,
      eventType: eventType.value === "all" ? undefined : eventType.value,
      keyword: keyword.value.trim() || undefined,
      limit: EVENT_PAGE_SIZE,
      offset,
    };
    const page =
      dashboard.mode.value === "demo"
        ? loadDemoEventPage(query)
        : await loadEventPage(query);
    if (sequence !== requestSequence) return;
    events.value = reset ? page.events : [...events.value, ...page.events];
    total.value = page.total;
    hasMore.value = page.hasMore;
    lastLoadedAt.value = Date.now();
    stale = false;
  } catch (error) {
    if (sequence === requestSequence) {
      loadError.value = error instanceof Error ? error.message : "事件查询失败";
    }
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

export function refreshEvents(): Promise<void> {
  return loadPage(true);
}

export function loadMoreEvents(): Promise<void> {
  return loadPage(false);
}

/** 筛选或数据源变化：标记为脏，页面在显示时重新查询。 */
export function markEventsStale(): void {
  stale = true;
}

/** 列表页挂载时激活；内容仍新鲜时保留已加载的分页与滚动位置。 */
export function activateEvents(): void {
  active = true;
  if (stale || !events.value.length) void loadPage(true);
}

/** 页面卸载后不再跟随筛选变化，但保留已加载内容与筛选条件。 */
export function deactivateEvents(): void {
  active = false;
}

export function eventsActive(): boolean {
  return active;
}

export function useEventsStore() {
  return {
    appId: dashboard.appId,
    hours: dashboard.hours,
    mode: dashboard.mode,
    eventType,
    keyword,
    events,
    total,
    hasMore,
    loading,
    loadError,
    scrollTop,
    lastLoadedAt,
    typeFilters: EVENT_TYPE_FILTERS,
    refreshEvents,
    loadMoreEvents,
    markEventsStale,
    activateEvents,
    deactivateEvents,
    eventsActive,
  };
}
