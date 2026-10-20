import { watch } from "vue";
import { useEventsStore } from "../stores/events";

const SEARCH_DEBOUNCE_MS = 300;

const store = useEventsStore();

let searchTimer: ReturnType<typeof setTimeout> | undefined;

// 应用、时间范围、数据源或类型变化时重新查询第一页。
watch([store.appId, store.hours, store.mode, store.eventType], () => {
  store.markEventsStale();
  if (store.eventsActive()) void store.refreshEvents();
});

// 关键字走服务端查询，输入时做防抖。
watch(store.keyword, () => {
  store.markEventsStale();
  if (!store.eventsActive()) return;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(
    () => void store.refreshEvents(),
    SEARCH_DEBOUNCE_MS,
  );
});

/** 事件列表页的视图门面：挂载时确保有数据，卸载时停止联动。 */
export function useEvents() {
  return {
    events: store.events,
    total: store.total,
    hasMore: store.hasMore,
    loading: store.loading,
    loadError: store.loadError,
    eventType: store.eventType,
    keyword: store.keyword,
    scrollTop: store.scrollTop,
    typeFilters: store.typeFilters,
    refreshEvents: store.refreshEvents,
    loadMoreEvents: store.loadMoreEvents,
    initializeEvents: store.activateEvents,
    disposeEvents: store.deactivateEvents,
  };
}
