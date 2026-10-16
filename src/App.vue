<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import type { EChartsOption } from "echarts";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  Clock3,
  Database,
  LayoutDashboard,
  Menu,
  MousePointer2,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  X,
} from "@lucide/vue";
import EChart from "./components/EChart.vue";
import { fetchApps, fetchOverview } from "./api/dashboard";
import { demoApps, makeDemo } from "./data/demo";
import type { MonitorApp, Overview, RoleKey, ViewKey } from "./types";

const nav: { key: ViewKey; label: string; icon: typeof Activity }[] = [
  { key: "overview", label: "监控总览", icon: LayoutDashboard },
  { key: "errors", label: "错误分析", icon: ShieldAlert },
  { key: "performance", label: "性能体验", icon: Activity },
  { key: "behavior", label: "用户行为", icon: MousePointer2 },
  { key: "events", label: "事件明细", icon: BarChart3 },
];
const titles: Record<ViewKey, string> = {
  overview: "监控总览",
  errors: "错误分析",
  performance: "性能体验",
  behavior: "用户行为",
  events: "事件明细",
};

const initialHash = window.location.hash.replace("#/", "") as ViewKey;
const view = ref<ViewKey>(
  nav.some((item) => item.key === initialHash) ? initialHash : "overview",
);
const role = ref<RoleKey>("engineering");
const mode = ref<"demo" | "live">("demo");
const token = ref(sessionStorage.getItem("weils-dashboard-token") || "");
const tokenInput = ref("");
const apps = ref<MonitorApp[]>(demoApps);
const appId = ref("web-portal");
const hours = ref(24);
const overview = ref<Overview | null>(makeDemo());
const loading = ref(false);
const connectOpen = ref(false);
const connectError = ref("");
const loadError = ref("");
const lastUpdated = ref(Date.now());
const mobileNavOpen = ref(false);
const eventFilter = ref("all");
const eventSearch = ref("");
const activeIndex = ref(0);
const tokenField = ref<HTMLInputElement>();
let requestSequence = 0;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let syncingConnection = false;

const currentApp = computed(() =>
  apps.value.find((item) => item.appId === appId.value),
);
const data = computed(() => overview.value);
const metricMap = computed(() =>
  Object.fromEntries(
    (data.value?.vitals || []).map((item) => [item.metric, item]),
  ),
);
const hasData = computed(() =>
  Boolean(
    data.value &&
    (data.value.summary.pageViews +
      data.value.summary.errors +
      data.value.summary.requests >
      0 ||
      data.value.vitals.some((item) => item.samples > 0) ||
      data.value.recentEvents.length > 0),
  ),
);
const maxRoute = computed(() =>
  Math.max(
    1,
    ...(data.value?.routes || []).map((item) => Number(item.pageViews)),
  ),
);
const filteredEvents = computed(() =>
  (data.value?.recentEvents || []).filter((event) => {
    const matchesType =
      eventFilter.value === "all" || event.eventType === eventFilter.value;
    const needle = eventSearch.value.toLowerCase().trim();
    const matchesSearch =
      !needle ||
      `${event.label} ${event.route} ${event.detail}`
        .toLowerCase()
        .includes(needle);
    return matchesType && matchesSearch;
  }),
);
const signalBand = computed(() => {
  const points = data.value?.timeline || [];
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
  const points = data.value?.timeline || [];
  return points[Math.min(activeIndex.value, points.length - 1)] || null;
});
const peakVisitIndex = computed(() => {
  const points = data.value?.timeline || [];
  return points.reduce(
    (best, point, index) =>
      Number(point.pageViews) > Number(points[best]?.pageViews || 0)
        ? index
        : best,
    0,
  );
});
const summaryMetrics = computed(() => {
  const s = data.value?.summary;
  const lcp = metricMap.value.LCP;
  return role.value === "engineering"
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
          value: String(data.value?.routes.length || 0),
          unit: "个",
          note: "本时段有访问的路由",
          tone: "normal",
        },
      ];
});

function formatNumber(value: number | string | undefined): string {
  if (value === undefined || value === null) return "—";
  return Number(value).toLocaleString("zh-CN");
}
function formatVital(metric: string, value: number): string {
  if (metric === "CLS") return value.toFixed(3);
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${Math.round(value)} ms`;
}
function formatTime(value: number | string | undefined): string {
  if (!value) return "—";
  return new Date(Number(value)).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatShortTime(value: number): string {
  return new Date(Number(value)).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function eventName(type: string): string {
  return (
    (
      {
        performance: "性能",
        request: "请求",
        resource: "资源",
        error: "错误",
        stability: "稳定性",
        behavior: "行为",
      } as Record<string, string>
    )[type] || type
  );
}
function humanErrorType(type: string): string {
  return (
    (
      {
        http_error: "接口错误",
        js_error: "JavaScript",
        framework_error: "框架错误",
        resource_error: "资源错误",
        promise_error: "Promise",
        blank_screen: "白屏",
        performance: "性能",
        stability: "稳定性",
      } as Record<string, string>
    )[type] ||
    type ||
    "其他错误"
  );
}

const baseChart = {
  animationDuration: 420,
  textStyle: { fontFamily: "Arial, sans-serif", color: "#526b72" },
  grid: { left: 38, right: 40, top: 20, bottom: 30, containLabel: true },
  tooltip: {
    trigger: "axis",
    confine: true,
    backgroundColor: "#102238",
    borderWidth: 0,
    textStyle: { color: "#f3f8f6" },
  },
} as const;

const trendOption = computed<EChartsOption>(() => {
  const points = data.value?.timeline || [];
  const labels = points.map((point) =>
    hours.value > 24
      ? formatTime(Number(point.bucket))
      : formatShortTime(Number(point.bucket)),
  );
  const anomaly = signalBand.value;
  return {
    ...baseChart,
    grid: { left: 8, right: 16, top: 20, bottom: 8, containLabel: true },
    legend: {
      top: 0,
      right: 0,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: "#526b72", fontSize: 12 },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#526b72",
        interval: Math.max(0, Math.floor(points.length / 5) - 1),
      },
    },
    yAxis: [
      {
        type: "value",
        min: 0,
        splitNumber: 4,
        axisLabel: { color: "#526b72" },
        splitLine: { lineStyle: { color: "#e9eeec" } },
      },
      {
        type: "value",
        min: 0,
        splitNumber: 4,
        axisLabel: { color: "#9c4b37" },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "页面访问",
        type: "line",
        yAxisIndex: 0,
        showSymbol: false,
        smooth: 0.24,
        lineStyle: { width: 3, color: "#30988f" },
        itemStyle: { color: "#30988f" },
        areaStyle: { color: "rgba(48, 152, 143, .11)" },
        data: points.map((p) => Number(p.pageViews)),
        markLine: {
          silent: true,
          symbol: ["none", "none"],
          label: { show: false },
          lineStyle: { color: "#276f69", type: "dotted", width: 1.5 },
          data:
            activePoint.value && activeIndex.value !== anomaly?.peakIndex
              ? [{ xAxis: labels[activeIndex.value] }]
              : [],
        },
      },
      {
        name: "错误事件",
        type: "line",
        yAxisIndex: 1,
        showSymbol: false,
        smooth: 0.2,
        lineStyle: {
          width: role.value === "engineering" ? 2.5 : 1.6,
          color: "#d5795c",
          opacity: role.value === "engineering" ? 1 : 0.58,
        },
        itemStyle: { color: "#d5795c" },
        areaStyle: { color: "rgba(213, 121, 92, .06)" },
        data: points.map((p) => Number(p.errors)),
        markLine: {
          silent: true,
          symbol: ["none", "none"],
          label: { show: false },
          lineStyle: { color: "#d5795c", type: "dashed", width: 1.5 },
          data: anomaly ? [{ xAxis: labels[anomaly.peakIndex] }] : [],
        },
      },
    ],
  };
});

const errorOption = computed<EChartsOption>(() => {
  const types = [...(data.value?.errorTypes || [])].reverse();
  return {
    ...baseChart,
    grid: { left: 8, right: 28, top: 10, bottom: 6, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: "#526b72" },
      splitLine: { lineStyle: { color: "#edf1ef" } },
    },
    yAxis: {
      type: "category",
      data: types.map((item) => humanErrorType(item.type)),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#48606a", fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        barWidth: 11,
        itemStyle: { color: "#d5795c", borderRadius: [0, 4, 4, 0] },
        data: types.map((item) => Number(item.count)),
      },
    ],
  };
});

const routesOption = computed<EChartsOption>(() => {
  const routes = [...(data.value?.routes || [])].slice(0, 6).reverse();
  return {
    ...baseChart,
    grid: { left: 8, right: 26, top: 6, bottom: 8, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: "#526b72" },
      splitLine: { lineStyle: { color: "#edf1ef" } },
    },
    yAxis: {
      type: "category",
      data: routes.map((item) => item.route || "/"),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#48606a", width: 110, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        barWidth: 14,
        itemStyle: { color: "#4a9d95", borderRadius: [0, 5, 5, 0] },
        data: routes.map((item) => Number(item.pageViews)),
      },
    ],
  };
});

const vitalOption = computed<EChartsOption>(() => {
  const metrics = [...(data.value?.vitals || [])].reverse();
  return {
    ...baseChart,
    grid: { left: 8, right: 20, top: 10, bottom: 8, containLabel: true },
    legend: { top: 0, right: 0, icon: "circle", itemWidth: 8, itemHeight: 8 },
    xAxis: {
      type: "value",
      max: 100,
      axisLabel: { formatter: "{value}%", color: "#526b72" },
      splitLine: { lineStyle: { color: "#edf1ef" } },
    },
    yAxis: {
      type: "category",
      data: metrics.map((item) => item.metric),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#48606a" },
    },
    series: [
      {
        name: "良好",
        type: "bar",
        stack: "rating",
        barWidth: 16,
        itemStyle: { color: "#30988f" },
        data: metrics.map((item) => percent(item.good, item.samples)),
      },
      {
        name: "待改善",
        type: "bar",
        stack: "rating",
        itemStyle: { color: "#dfb35a" },
        data: metrics.map((item) =>
          percent(item.needsImprovement, item.samples),
        ),
      },
      {
        name: "较差",
        type: "bar",
        stack: "rating",
        itemStyle: { color: "#d5795c" },
        data: metrics.map((item) => percent(item.poor, item.samples)),
      },
    ],
  };
});

function percent(value: number | string, total: number | string): number {
  return Number(total) ? Math.round((Number(value) / Number(total)) * 100) : 0;
}

function navigate(key: ViewKey) {
  view.value = key;
  window.location.hash = `/${key}`;
  mobileNavOpen.value = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function handleHash() {
  const key = window.location.hash.replace("#/", "") as ViewKey;
  if (nav.some((item) => item.key === key)) view.value = key;
}
async function loadAppsAndOverview(accessToken: string, preferredApp?: string) {
  const sequence = ++requestSequence;
  loading.value = true;
  loadError.value = "";
  try {
    const foundApps = await fetchApps(accessToken);
    if (sequence !== requestSequence) return;
    const selected =
      foundApps.find((item) => item.appId === preferredApp)?.appId ||
      foundApps[0]?.appId ||
      "";
    const result = selected
      ? await fetchOverview(accessToken, selected, hours.value)
      : null;
    if (sequence !== requestSequence) return;
    syncingConnection = true;
    apps.value = foundApps;
    appId.value = selected;
    overview.value = result;
    lastUpdated.value = Date.now();
    await nextTick();
    syncingConnection = false;
  } catch (error) {
    if (sequence === requestSequence)
      loadError.value = error instanceof Error ? error.message : "连接失败";
    throw error;
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}
async function reload() {
  if (mode.value === "demo") {
    overview.value = makeDemo(appId.value, hours.value);
    lastUpdated.value = Date.now();
    return;
  }
  if (!token.value || !appId.value) return;
  const sequence = ++requestSequence;
  loading.value = true;
  loadError.value = "";
  try {
    const result = await fetchOverview(token.value, appId.value, hours.value);
    if (sequence === requestSequence) {
      overview.value = result;
      lastUpdated.value = Date.now();
    }
  } catch (error) {
    if (sequence === requestSequence)
      loadError.value = error instanceof Error ? error.message : "刷新失败";
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}
async function connect() {
  const nextToken = tokenInput.value.trim();
  if (!nextToken) {
    connectError.value = "请输入管理查询令牌";
    return;
  }
  connectError.value = "";
  try {
    await loadAppsAndOverview(nextToken, appId.value);
    token.value = nextToken;
    sessionStorage.setItem("weils-dashboard-token", nextToken);
    mode.value = "live";
    connectOpen.value = false;
    tokenInput.value = "";
  } catch (error) {
    connectError.value = error instanceof Error ? error.message : "连接失败";
  }
}
function useDemo() {
  ++requestSequence;
  mode.value = "demo";
  token.value = "";
  sessionStorage.removeItem("weils-dashboard-token");
  apps.value = demoApps;
  appId.value = "web-portal";
  overview.value = makeDemo(appId.value, hours.value);
  loadError.value = "";
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
watch([appId, hours], () => {
  if (!syncingConnection) void reload();
});
watch(
  [data, role],
  () => {
    activeIndex.value =
      role.value === "engineering"
        ? signalBand.value?.peakIndex || 0
        : peakVisitIndex.value;
  },
  { immediate: true },
);
onMounted(() => {
  window.addEventListener("hashchange", handleHash);
  window.addEventListener("keydown", handleKeydown);
  if (token.value) {
    mode.value = "live";
    void loadAppsAndOverview(token.value, appId.value).catch(() => {
      overview.value = null;
    });
  }
  refreshTimer = setInterval(() => {
    if (mode.value === "live" && document.visibilityState === "visible")
      void reload();
  }, 60000);
});
onBeforeUnmount(() => {
  window.removeEventListener("hashchange", handleHash);
  window.removeEventListener("keydown", handleKeydown);
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ 'sidebar-open': mobileNavOpen }">
      <div class="brand">
        <div class="brand-mark">
          <Activity :size="20" :stroke-width="2.5" />
        </div>
        <div><strong>WEILS</strong><span>MONITOR</span></div>
      </div>
      <div class="workspace-label">数据工作台</div>
      <nav class="main-nav" aria-label="主导航">
        <button
          v-for="item in nav"
          :key="item.key"
          class="nav-item"
          :class="{ active: view === item.key }"
          type="button"
          :aria-current="view === item.key ? 'page' : undefined"
          @click="navigate(item.key)"
        >
          <component :is="item.icon" :size="18" :stroke-width="1.9" /><span>{{
            item.label
          }}</span
          ><ArrowRight v-if="view === item.key" :size="16" class="nav-arrow" />
        </button>
      </nav>
      <div class="sidebar-bottom">
        <div class="role-heading">工作视角</div>
        <div class="role-switch" role="group" aria-label="工作视角">
          <button
            type="button"
            :class="{ selected: role === 'engineering' }"
            @click="role = 'engineering'"
          >
            研发运维
          </button>
          <button
            type="button"
            :class="{ selected: role === 'product' }"
            @click="role = 'product'"
          >
            产品运营
          </button>
        </div>
        <div class="source-status">
          <span class="status-led" :class="mode" />{{
            mode === "live" ? "实时数据已连接" : "正在查看演示数据"
          }}
        </div>
      </div>
    </aside>

    <div class="main-shell">
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="icon-button mobile-menu"
            type="button"
            aria-label="打开导航"
            @click="mobileNavOpen = !mobileNavOpen"
          >
            <Menu :size="20" /></button
          ><span class="breadcrumb">工作台</span
          ><span class="breadcrumb-slash">/</span
          ><span class="breadcrumb-current">{{ titles[view] }}</span>
        </div>
        <div class="topbar-right">
          <span class="topbar-clock"
            ><Clock3 :size="15" /> {{ formatTime(lastUpdated) }} 更新</span
          ><button
            class="icon-button"
            type="button"
            title="连接设置"
            aria-label="连接设置"
            @click="openConnection"
          >
            <Settings2 :size="19" />
          </button>
          <div class="avatar" aria-label="监控管理端">W</div>
        </div>
      </header>

      <main class="main-content">
        <div class="page-head">
          <div>
            <h1>{{ titles[view] }}</h1>
            <p>
              {{
                view === "overview"
                  ? role === "engineering"
                    ? "观察系统信号，定位影响体验的变化。"
                    : "了解访问与体验变化，找到值得跟进的页面。"
                  : view === "errors"
                    ? "按类型与影响范围查看近期异常。"
                    : view === "performance"
                      ? "观察核心体验指标和采样质量。"
                      : view === "behavior"
                        ? "理解页面访问与用户路径。"
                        : "追踪最近上报的原始事件。"
              }}
            </p>
          </div>
          <div class="head-actions">
            <button
              class="outline-button refresh-button"
              type="button"
              :disabled="loading"
              @click="reload"
            >
              <RefreshCw :size="16" :class="{ spinning: loading }" />刷新数据
            </button>
          </div>
        </div>

        <div class="control-row">
          <div class="selectors">
            <label class="select-shell"
              ><Database :size="17" /><span class="sr-only">应用</span
              ><select v-model="appId" :disabled="apps.length === 0">
                <option v-if="apps.length === 0" value="">暂无应用</option>
                <option v-for="app in apps" :key="app.appId" :value="app.appId">
                  {{ app.projectName || app.appId }}
                </option></select
              ><ChevronDown :size="14" /></label
            ><label class="select-shell"
              ><Clock3 :size="17" /><span class="sr-only">时间范围</span
              ><select v-model.number="hours">
                <option :value="1">最近 1 小时</option>
                <option :value="6">最近 6 小时</option>
                <option :value="24">最近 24 小时</option>
                <option :value="72">最近 3 天</option>
                <option :value="168">最近 7 天</option></select
              ><ChevronDown :size="14"
            /></label>
          </div>
          <div class="data-source">
            <span class="source-dot" :class="mode" />{{
              mode === "demo"
                ? "演示数据 · 非真实监控"
                : "实时数据 · 每分钟更新"
            }}<button
              v-if="mode === 'demo'"
              type="button"
              @click="openConnection"
            >
              连接数据源 <ArrowRight :size="14" />
            </button>
          </div>
        </div>

        <div v-if="loadError" class="notice error-notice" role="alert">
          <AlertCircle :size="18" /><span
            >{{ loadError }}。请检查数据服务或重新连接。</span
          ><button type="button" @click="openConnection">连接设置</button>
        </div>
        <div v-if="mode === 'demo'" class="notice demo-notice">
          <Bell :size="17" /><span
            >当前为演示数据，用于预览界面；连接后将展示所选应用的真实上报。</span
          ><button type="button" @click="openConnection">
            立即连接 <ArrowRight :size="14" />
          </button>
        </div>

        <div v-if="loading && !data" class="empty-state">
          <RefreshCw :size="28" class="spinning" />
          <h2>正在读取监控数据</h2>
          <p>聚合查询完成后会显示所选应用的指标。</p>
        </div>
        <div v-else-if="!data || !hasData" class="empty-state">
          <Database :size="30" />
          <h2>当前范围内还没有监控事件</h2>
          <p>请确认 SDK 已上报，或切换应用与时间范围。</p>
          <button class="primary-button" type="button" @click="reload">
            重新查询
          </button>
        </div>

        <template v-else>
          <template v-if="view === 'overview'">
            <section class="metric-strip" aria-label="关键指标">
              <div
                v-for="item in summaryMetrics"
                :key="item.label"
                class="metric-item"
              >
                <div class="metric-label">
                  <span>{{ item.label }}</span>
                </div>
                <div class="metric-value" :class="item.tone">
                  {{ item.value
                  }}<small v-if="item.unit">{{ item.unit }}</small>
                </div>
                <div class="metric-note">{{ item.note }}</div>
              </div>
            </section>
            <div class="feature-grid">
              <section class="panel trend-panel">
                <div class="panel-heading">
                  <div>
                    <h2>
                      {{ role === "engineering" ? "事件信号" : "访问节奏" }}
                    </h2>
                    <p>访问与错误沿同一时间轴变化，双轴分别计数</p>
                  </div>
                  <span class="panel-tag">{{
                    hours <= 24 ? "按小时" : "每 6 小时"
                  }}</span>
                </div>
                <div v-if="activePoint" class="signal-readout">
                  <div class="signal-time">
                    <span>时间探针</span
                    ><strong>{{ formatTime(activePoint.bucket) }}</strong>
                  </div>
                  <div class="signal-measure">
                    <span>页面访问</span
                    ><strong
                      >{{ formatNumber(activePoint.pageViews) }}
                      <small>PV</small></strong
                    >
                  </div>
                  <div class="signal-measure error-measure">
                    <span>错误事件</span
                    ><strong
                      >{{ formatNumber(activePoint.errors) }}
                      <small>次</small></strong
                    >
                  </div>
                  <span
                    v-if="
                      signalBand &&
                      activeIndex >= signalBand.start &&
                      activeIndex <= signalBand.end
                    "
                    class="signal-alert"
                    >{{
                      activeIndex === signalBand.peakIndex
                        ? "错误峰值"
                        : "错误抬升时段"
                    }}</span
                  >
                </div>
                <div class="chart-wrap trend-chart">
                  <EChart
                    :option="trendOption"
                    label="页面访问和错误事件趋势图"
                  />
                </div>
                <label v-if="data.timeline.length > 1" class="time-scrubber"
                  ><span>观察时刻</span
                  ><input
                    v-model.number="activeIndex"
                    type="range"
                    min="0"
                    :max="data.timeline.length - 1"
                    step="1"
                    aria-label="选择观察时刻"
                  /><span>{{
                    formatShortTime(activePoint?.bucket || data.to)
                  }}</span></label
                >
                <div class="trend-footer">
                  <span><i class="legend-dot teal" /> 页面访问</span
                  ><span><i class="legend-dot coral" /> 错误事件</span
                  ><span class="footer-range"
                    >{{ formatTime(data.from) }} —
                    {{ formatTime(data.to) }}</span
                  >
                </div>
              </section>
              <section class="panel attention-panel">
                <div class="panel-heading">
                  <div>
                    <h2>
                      {{ role === "engineering" ? "需要关注" : "访问焦点" }}
                    </h2>
                    <p>
                      {{
                        role === "engineering"
                          ? "按近期发生与影响排序"
                          : "当前访问最多的页面"
                      }}
                    </p>
                  </div>
                  <span class="count-badge">{{
                    role === "engineering"
                      ? data.issues.length
                      : data.routes.length
                  }}</span>
                </div>
                <div
                  v-if="role === 'engineering' && data.issues.length"
                  class="issue-list"
                >
                  <button
                    v-for="(issue, index) in data.issues.slice(0, 4)"
                    :key="issue.fingerprint"
                    type="button"
                    class="issue-row"
                    @click="navigate('errors')"
                  >
                    <span class="issue-rank">{{
                      String(index + 1).padStart(2, "0")
                    }}</span
                    ><span class="issue-main"
                      ><strong>{{
                        issue.message || humanErrorType(issue.type)
                      }}</strong
                      ><small
                        >{{ humanErrorType(issue.type) }} ·
                        {{ formatNumber(issue.count) }} 次 ·
                        {{ formatNumber(issue.affectedSessions) }} 会话</small
                      ></span
                    ><ArrowUpRight :size="17" />
                  </button>
                </div>
                <div
                  v-else-if="role === 'product' && data.routes.length"
                  class="issue-list"
                >
                  <button
                    v-for="(route, index) in data.routes.slice(0, 4)"
                    :key="route.route"
                    type="button"
                    class="issue-row"
                    @click="navigate('behavior')"
                  >
                    <span class="issue-rank">{{
                      String(index + 1).padStart(2, "0")
                    }}</span>
                    <span class="issue-main"
                      ><strong>{{ route.route || "/" }}</strong
                      ><small
                        >{{ formatNumber(route.pageViews) }} PV ·
                        {{ formatNumber(route.visitors) }} 访客</small
                      ></span
                    >
                    <ArrowUpRight :size="17" />
                  </button>
                </div>
                <div v-else class="panel-empty">
                  {{
                    role === "engineering"
                      ? "当前时段没有错误聚类。"
                      : "当前时段还没有页面访问。"
                  }}
                </div>
                <button
                  class="text-link panel-link"
                  type="button"
                  @click="
                    navigate(role === 'engineering' ? 'errors' : 'behavior')
                  "
                >
                  {{ role === "engineering" ? "查看全部错误" : "查看页面分析" }}
                  <ArrowRight :size="15" />
                </button>
              </section>
            </div>
            <div
              class="lower-grid"
              :class="{ 'product-grid': role === 'product' }"
            >
              <section class="panel vital-panel">
                <div class="panel-heading">
                  <div>
                    <h2>核心体验指标</h2>
                    <p>按 P75 分位数观察真实用户体验</p>
                  </div>
                  <button
                    class="text-link"
                    type="button"
                    @click="navigate('performance')"
                  >
                    查看性能 <ArrowRight :size="15" />
                  </button>
                </div>
                <div class="vital-list">
                  <div
                    v-for="vital in data.vitals.slice(0, 3)"
                    :key="vital.metric"
                    class="vital-row"
                  >
                    <span class="vital-name">{{ vital.metric }}</span>
                    <div class="vital-bar">
                      <span
                        class="good"
                        :style="{
                          width: `${percent(vital.good, vital.samples)}%`,
                        }"
                      /><span
                        class="fair"
                        :style="{
                          width: `${percent(vital.needsImprovement, vital.samples)}%`,
                        }"
                      /><span
                        class="poor"
                        :style="{
                          width: `${percent(vital.poor, vital.samples)}%`,
                        }"
                      />
                    </div>
                    <strong>{{
                      formatVital(vital.metric, Number(vital.p75))
                    }}</strong>
                  </div>
                </div>
                <div class="panel-key">
                  <span><i class="legend-dot teal" /> 良好</span
                  ><span><i class="legend-dot amber" /> 待改善</span
                  ><span><i class="legend-dot coral" /> 较差</span>
                </div>
              </section>
              <section class="panel routes-panel">
                <div class="panel-heading">
                  <div>
                    <h2>热门页面</h2>
                    <p>按页面访问量排序</p>
                  </div>
                  <button
                    class="text-link"
                    type="button"
                    @click="navigate('behavior')"
                  >
                    查看行为 <ArrowRight :size="15" />
                  </button>
                </div>
                <div class="route-list">
                  <div
                    v-for="route in data.routes.slice(0, 4)"
                    :key="route.route"
                    class="route-row"
                  >
                    <span class="route-name" :title="route.route">{{
                      route.route || "/"
                    }}</span
                    ><span class="route-track"
                      ><span
                        :style="{
                          width: `${(Number(route.pageViews) / maxRoute) * 100}%`,
                        }" /></span
                    ><strong>{{ formatNumber(route.pageViews) }}</strong>
                  </div>
                </div>
              </section>
            </div>
          </template>

          <template v-else-if="view === 'errors'"
            ><section class="section-summary">
              <div>
                <span>错误事件</span
                ><strong>{{ formatNumber(data.summary.errors) }}</strong
                ><small>当前范围内全部错误</small>
              </div>
              <div>
                <span>稳定性异常</span
                ><strong>{{
                  formatNumber(data.summary.stabilityIssues)
                }}</strong
                ><small>包含白屏与崩溃</small>
              </div>
              <div>
                <span>错误聚类</span
                ><strong>{{ formatNumber(data.issues.length) }}</strong
                ><small>按指纹聚合</small>
              </div>
            </section>
            <div class="analysis-grid">
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>错误类型分布</h2>
                    <p>识别异常的主要来源</p>
                  </div>
                </div>
                <div class="chart-wrap medium-chart">
                  <EChart :option="errorOption" label="错误类型分布柱状图" />
                </div>
              </section>
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>近期高频问题</h2>
                    <p>按发生次数排序</p>
                  </div>
                </div>
                <div class="issue-list">
                  <div
                    v-for="issue in data.issues.slice(0, 5)"
                    :key="issue.fingerprint"
                    class="issue-row static"
                  >
                    <span class="severity-mark" /><span class="issue-main"
                      ><strong>{{
                        issue.message || humanErrorType(issue.type)
                      }}</strong
                      ><small
                        >{{ formatNumber(issue.count) }} 次 · 影响
                        {{ formatNumber(issue.affectedSessions) }} 会话</small
                      ></span
                    ><span class="issue-time">{{
                      formatTime(issue.lastSeen)
                    }}</span>
                  </div>
                </div>
              </section>
            </div>
            <section class="panel table-panel">
              <div class="panel-heading">
                <div>
                  <h2>错误聚类明细</h2>
                  <p>相同指纹的事件合并展示</p>
                </div>
              </div>
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>错误信息</th>
                      <th>类型</th>
                      <th>次数</th>
                      <th>影响会话</th>
                      <th>最近发生</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="issue in data.issues" :key="issue.fingerprint">
                      <td class="message-cell">
                        {{ issue.message || "未提供错误信息" }}
                      </td>
                      <td>{{ humanErrorType(issue.type) }}</td>
                      <td>{{ formatNumber(issue.count) }}</td>
                      <td>{{ formatNumber(issue.affectedSessions) }}</td>
                      <td>{{ formatTime(issue.lastSeen) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section></template
          >

          <template v-else-if="view === 'performance'"
            ><section class="section-summary">
              <div>
                <span>采样指标</span><strong>{{ data.vitals.length }}</strong
                ><small>Core Web Vitals 与加载指标</small>
              </div>
              <div>
                <span>请求总量</span
                ><strong>{{ formatNumber(data.summary.requests) }}</strong
                ><small>所选时段内</small>
              </div>
              <div>
                <span>失败请求</span
                ><strong>{{ formatNumber(data.summary.failedRequests) }}</strong
                ><small>HTTP 错误与网络失败</small>
              </div>
            </section>
            <div class="analysis-grid performance-grid">
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>体验质量构成</h2>
                    <p>各指标按 SDK 评级统计样本占比</p>
                  </div>
                </div>
                <div class="chart-wrap medium-chart">
                  <EChart :option="vitalOption" label="核心体验指标评级占比" />
                </div>
              </section>
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>P75 指标读数</h2>
                    <p>75% 的样本不超过此数值</p>
                  </div>
                </div>
                <div class="performance-list">
                  <div v-for="vital in data.vitals" :key="vital.metric">
                    <span class="performance-icon"><Activity :size="17" /></span
                    ><span
                      ><strong>{{ vital.metric }}</strong
                      ><small
                        >{{ formatNumber(vital.samples) }} 个样本</small
                      ></span
                    ><b>{{ formatVital(vital.metric, Number(vital.p75)) }}</b>
                  </div>
                </div>
              </section>
            </div>
            <section class="info-note">
              <AlertCircle :size="17" /><span
                >指标由 SDK
                上报，评级来自采集时的报告值；图中为当前应用及时间范围的实际样本聚合。</span
              >
            </section></template
          >

          <template v-else-if="view === 'behavior'"
            ><section class="section-summary">
              <div>
                <span>页面访问</span
                ><strong>{{ formatNumber(data.summary.pageViews) }}</strong
                ><small>page_view 事件</small>
              </div>
              <div>
                <span>独立访客</span
                ><strong>{{ formatNumber(data.summary.visitors) }}</strong
                ><small>按用户或会话去重</small>
              </div>
              <div>
                <span>访问会话</span
                ><strong>{{ formatNumber(data.summary.sessions) }}</strong
                ><small>有页面访问的会话</small>
              </div>
            </section>
            <div class="analysis-grid">
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>热门页面</h2>
                    <p>访问量最高的路由</p>
                  </div>
                </div>
                <div class="chart-wrap medium-chart">
                  <EChart :option="routesOption" label="热门页面访问量柱状图" />
                </div>
              </section>
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>页面表现</h2>
                    <p>访问与独立访客</p>
                  </div>
                </div>
                <div class="compact-routes">
                  <div
                    v-for="(route, index) in data.routes.slice(0, 6)"
                    :key="route.route"
                  >
                    <span>{{ String(index + 1).padStart(2, "0") }}</span
                    ><strong :title="route.route">{{
                      route.route || "/"
                    }}</strong
                    ><small>{{ formatNumber(route.pageViews) }} PV</small>
                  </div>
                </div>
              </section>
            </div>
            <section class="panel table-panel">
              <div class="panel-heading">
                <div>
                  <h2>页面明细</h2>
                  <p>按访问量排序</p>
                </div>
              </div>
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>页面路由</th>
                      <th>页面访问</th>
                      <th>独立访客</th>
                      <th>访客访问比</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="route in data.routes" :key="route.route">
                      <td class="message-cell">{{ route.route || "/" }}</td>
                      <td>{{ formatNumber(route.pageViews) }}</td>
                      <td>{{ formatNumber(route.visitors) }}</td>
                      <td>
                        {{
                          Number(route.visitors)
                            ? (
                                Number(route.pageViews) / Number(route.visitors)
                              ).toFixed(1)
                            : "—"
                        }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section></template
          >

          <template v-else
            ><section class="panel table-panel events-panel">
              <div class="panel-heading">
                <div>
                  <h2>最近上报事件</h2>
                  <p>保留最近 20 条，按时间倒序</p>
                </div>
                <div class="event-tools">
                  <label class="search-box"
                    ><Search :size="16" /><span class="sr-only">搜索事件</span
                    ><input
                      v-model="eventSearch"
                      placeholder="搜索内容或路由" /></label
                  ><label class="event-select"
                    ><span class="sr-only">事件类型</span
                    ><select v-model="eventFilter">
                      <option value="all">全部类型</option>
                      <option value="error">错误</option>
                      <option value="stability">稳定性</option>
                      <option value="performance">性能</option>
                      <option value="request">请求</option>
                      <option value="resource">资源</option>
                      <option value="behavior">行为</option></select
                    ><ChevronDown :size="14"
                  /></label>
                </div>
              </div>
              <div v-if="filteredEvents.length" class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>发生时间</th>
                      <th>类型</th>
                      <th>事件内容</th>
                      <th>路由</th>
                      <th>补充信息</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="event in filteredEvents" :key="event.eventId">
                      <td>{{ formatTime(event.timestamp) }}</td>
                      <td>
                        <span class="event-type" :class="event.eventType">{{
                          eventName(event.eventType)
                        }}</span>
                      </td>
                      <td class="message-cell">
                        {{ event.label || "未命名事件" }}
                      </td>
                      <td>{{ event.route || "—" }}</td>
                      <td>{{ event.detail || "—" }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="panel-empty">没有符合当前筛选的事件。</div>
            </section></template
          >
        </template>

        <footer class="page-footer">
          <span>WEILS MONITOR · 数据观测工作台</span
          ><span
            >{{ currentApp?.appId || "未选择应用" }}
            <span class="footer-separator">/</span>
            {{ mode === "demo" ? "演示模式" : "监控服务" }}</span
          >
        </footer>
      </main>
    </div>

    <div
      v-if="connectOpen"
      class="dialog-backdrop"
      @click.self="connectOpen = false"
    >
      <section
        class="connect-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-title"
      >
        <div class="dialog-head">
          <div class="dialog-icon"><Database :size="22" /></div>
          <button
            class="icon-button"
            type="button"
            aria-label="关闭"
            @click="connectOpen = false"
          >
            <X :size="20" />
          </button>
        </div>
        <h2 id="connect-title">连接监控数据源</h2>
        <p>
          输入后端配置的管理查询令牌，读取应用与聚合指标。令牌仅保存在当前浏览器会话中。
        </p>
        <label class="token-label" for="dashboard-token">管理查询令牌</label
        ><input
          id="dashboard-token"
          ref="tokenField"
          v-model="tokenInput"
          class="token-input"
          type="password"
          autocomplete="off"
          placeholder="MONITOR_DASHBOARD_TOKEN"
          @keyup.enter="connect"
        />
        <div v-if="connectError" class="connect-error" role="alert">
          <AlertCircle :size="15" />{{ connectError }}
        </div>
        <div class="dialog-actions">
          <button
            v-if="mode === 'live'"
            class="quiet-button"
            type="button"
            @click="useDemo"
          >
            切换演示数据</button
          ><button
            class="primary-button"
            type="button"
            :disabled="loading"
            @click="connect"
          >
            <RefreshCw v-if="loading" :size="16" class="spinning" /><Check
              v-else
              :size="16"
            />{{ loading ? "正在连接" : "连接数据源" }}
          </button>
        </div>
        <div class="dialog-hint">
          <ShieldAlert
            :size="15"
          />生产环境应通过受控访问提供工作台，不要把令牌写入构建变量。
        </div>
      </section>
    </div>
  </div>
</template>
