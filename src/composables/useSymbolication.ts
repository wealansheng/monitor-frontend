import { computed, onScopeDispose, ref, watch } from "vue";
import type { MonitorEventDetail, SymbolicationResult } from "../types";
import { loadSymbolication } from "../services/dashboard";
import { useDashboardStore } from "../stores/dashboard";

/** Independent request state; every route/source change invalidates older responses. */
export function useSymbolication(getDetail: () => MonitorEventDetail | null) {
  const dashboard = useDashboardStore();
  const result = ref<SymbolicationResult | null>(null);
  const loading = ref(false);
  const error = ref("");
  const selected = ref(0);
  let sequence = 0;
  const frame = computed(() => result.value?.frames[selected.value]);

  async function reload() {
    const current = ++sequence;
    result.value = null;
    error.value = "";
    loading.value = false;
    selected.value = 0;
    const detail = getDetail();
    if (
      !detail ||
      detail.event.event_type !== "error" ||
      dashboard.mode.value !== "live" ||
      detail.appId !== dashboard.appId.value
    )
      return;
    loading.value = true;
    try {
      const response = await loadSymbolication(detail.appId, detail.eventId);
      if (current !== sequence) return;
      result.value = response;
      selected.value = Math.max(
        0,
        response.frames.findIndex((item) => item.status === "mapped"),
      );
    } catch (cause) {
      if (current === sequence)
        error.value =
          cause instanceof Error ? cause.message : "源码定位读取失败";
    } finally {
      if (current === sequence) loading.value = false;
    }
  }

  watch([getDetail, dashboard.appId, dashboard.mode], () => void reload(), {
    immediate: true,
    flush: "sync",
  });
  onScopeDispose(() => {
    sequence++;
  });
  return {
    result,
    loading,
    error,
    selected,
    frame,
    reload,
    mode: dashboard.mode,
  };
}
