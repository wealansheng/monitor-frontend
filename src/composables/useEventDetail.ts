import { computed, onScopeDispose, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { loadDemoEventDetail, loadEventDetail } from "../services/dashboard";
import { useDashboardStore } from "../stores/dashboard";
import type { EventTypeKey, MonitorEventDetail } from "../types";

const dashboard = useDashboardStore();

/** 事件详情：页面级状态，随路由参数与当前应用变化重新读取。 */
export function useEventDetail() {
  const route = useRoute();
  const eventId = computed(() => String(route.params.eventId ?? ""));
  const eventType = computed(() =>
    typeof route.query.type === "string"
      ? (route.query.type as EventTypeKey)
      : undefined,
  );

  const detail = ref<MonitorEventDetail | null>(null);
  const loading = ref(false);
  const loadError = ref("");
  let requestSequence = 0;

  async function load(): Promise<void> {
    const sequence = ++requestSequence;
    const id = eventId.value;
    const appId = dashboard.appId.value;
    if (!id || !appId) {
      detail.value = null;
      loading.value = false;
      loadError.value = id ? "尚未选择应用" : "";
      return;
    }

    loading.value = true;
    loadError.value = "";
    detail.value = null;
    try {
      const query = { appId, eventId: id, eventType: eventType.value };
      const result =
        dashboard.mode.value === "demo"
          ? loadDemoEventDetail({ ...query, hours: dashboard.hours.value })
          : await loadEventDetail(query);
      if (sequence === requestSequence) detail.value = result;
    } catch (error) {
      if (sequence === requestSequence) {
        loadError.value =
          error instanceof Error ? error.message : "事件详情读取失败";
      }
    } finally {
      if (sequence === requestSequence) loading.value = false;
    }
  }

  watch(
    [eventId, eventType, dashboard.appId, dashboard.mode],
    () => void load(),
    { immediate: true, flush: 'sync' },
  );
  onScopeDispose(() => { requestSequence++ });

  return { detail, loading, loadError, reload: load };
}
