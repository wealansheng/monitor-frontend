import { computed, nextTick, ref, watch } from "vue";
import { useChartOptions } from "../charts/useChartOptions";
import { useDashboardStore } from "../stores/dashboard";
import { formatNumber, formatVital } from "../utils/format";

const store = useDashboardStore();

/** 视图交互状态：只服务于界面，不参与数据查询。 */
const tokenInput = ref("");
const connectOpen = ref(false);
const connectError = ref("");
const mobileNavOpen = ref(false);
const activeIndex = ref(0);
const tokenField = ref<HTMLInputElement>();

let started = false;
let refreshTimer: ReturnType<typeof setInterval> | undefined;

function setTokenField(element: unknown) {
  tokenField.value = element instanceof HTMLInputElement ? element : undefined;
}

const metricMap = computed(() =>
  Object.fromEntries(
    (store.data.value?.vitals || []).map((item) => [item.metric, item]),
  ),
);

const signalBand = computed(() => {
  const points = store.data.value?.timeline || [];
  if (points.length < 3) return null;
  const values = points.map((point) => Number(point.errors));
  const ordered = [...values].sort((a, b) => a - b);
  const median = ordered[Math.floor(ordered.length / 2)] || 0;
  const peak = Math.max(...values);
  if (peak < 2 || peak < median * 1.5) return null;
  const peakIndex = values.indexOf(peak);
  const threshold = Math.max(median * 1.45, peak * 0.7);
  let start = peakIndex;
  let end = peakIndex;
  while (start > 0 && values[start - 1]! >= threshold) start--;
  while (end < values.length - 1 && values[end + 1]! >= threshold) end++;
  return { start, end, peakIndex, peak };
});

const activePoint = computed(() => {
  const points = store.data.value?.timeline || [];
  return points[Math.min(activeIndex.value, points.length - 1)] || null;
});

const peakVisitIndex = computed(() => {
  const points = store.data.value?.timeline || [];
  return points.reduce(
    (best, point, index) =>
      Number(point.pageViews) > Number(points[best]?.pageViews || 0)
        ? index
        : best,
    0,
  );
});

const summaryMetrics = computed(() => {
  const s = store.data.value?.summary;
  const lcp = metricMap.value.LCP;
  return store.role.value === "engineering"
    ? [
        {
          label: "页面访问",
          value: formatNumber(s?.pageViews),
          unit: "PV",
          note: "所选时段内",
          tone: "normal",
        },
        {
          label: "错误事件",
          value: formatNumber(s?.errors),
          unit: "次",
          note: "包含稳定性异常",
          tone: s?.errors ? "danger" : "normal",
        },
        {
          label: "失败请求",
          value: formatNumber(s?.failedRequests),
          unit: "次",
          note: `共 ${formatNumber(s?.requests)} 次请求`,
          tone: s?.failedRequests ? "warning" : "normal",
        },
        {
          label: "LCP P75",
          value: lcp ? formatVital("LCP", Number(lcp.p75)) : "—",
          unit: "",
          note: lcp ? `${formatNumber(lcp.samples)} 个样本` : "暂无样本",
          tone: "normal",
        },
      ]
    : [
        {
          label: "页面访问",
          value: formatNumber(s?.pageViews),
          unit: "PV",
          note: "所选时段内",
          tone: "normal",
        },
        {
          label: "独立访客",
          value: formatNumber(s?.visitors),
          unit: "人",
          note: "按用户或会话去重",
          tone: "normal",
        },
        {
          label: "访问会话",
          value: formatNumber(s?.sessions),
          unit: "次",
          note: "有页面访问的会话",
          tone: "normal",
        },
        {
          label: "热门页面",
          value: String(store.data.value?.routes.length || 0),
          unit: "个",
          note: "本时段有访问的路由",
          tone: "normal",
        },
      ];
});

const { trendOption, errorOption, routesOption, vitalOption } = useChartOptions(
  {
    data: store.data,
    hours: store.hours,
    role: store.role,
    activePoint,
    activeIndex,
    signalBand,
  },
);

watch(
  [store.data, store.role],
  () => {
    activeIndex.value =
      store.role.value === "engineering"
        ? signalBand.value?.peakIndex || 0
        : peakVisitIndex.value;
  },
  { immediate: true },
);

async function connect() {
  const nextToken = tokenInput.value.trim();
  if (!nextToken) {
    connectError.value = "请输入管理查询令牌";
    return;
  }
  connectError.value = "";
  try {
    await store.connect(nextToken);
    connectOpen.value = false;
    tokenInput.value = "";
  } catch (error) {
    connectError.value = error instanceof Error ? error.message : "连接失败";
  }
}

function useDemo() {
  store.enterDemoMode();
  connectOpen.value = false;
}

function openConnection() {
  tokenInput.value = "";
  connectError.value = "";
  connectOpen.value = true;
  nextTick(() => tokenField.value?.focus());
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") connectOpen.value = false;
}

function initializeDashboard() {
  if (started) return;
  started = true;
  window.addEventListener("keydown", handleKeydown);
  store.restoreSession();
  refreshTimer = setInterval(() => {
    if (store.mode.value === "live" && document.visibilityState === "visible")
      void store.refresh();
  }, 60000);
}

function disposeDashboard() {
  if (!started) return;
  started = false;
  window.removeEventListener("keydown", handleKeydown);
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = undefined;
}

/** 视图门面：状态来自 store，交互与视图模型留在本层。 */
export function useDashboard() {
  return {
    role: store.role,
    mode: store.mode,
    apps: store.apps,
    appId: store.appId,
    hours: store.hours,
    loading: store.loading,
    loadError: store.loadError,
    lastUpdated: store.lastUpdated,
    currentApp: store.currentApp,
    data: store.data,
    hasData: store.hasData,
    maxRoute: store.maxRoute,
    tokenInput,
    connectOpen,
    connectError,
    mobileNavOpen,
    activeIndex,
    setTokenField,
    signalBand,
    activePoint,
    summaryMetrics,
    trendOption,
    errorOption,
    routesOption,
    vitalOption,
    reload: store.refresh,
    connect,
    useDemo,
    openConnection,
    initializeDashboard,
    disposeDashboard,
  };
}
