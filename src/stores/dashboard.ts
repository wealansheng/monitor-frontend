import { computed, nextTick, ref, watch } from "vue";
import {
  DEFAULT_APP_ID,
  DEFAULT_HOURS,
  listDemoApps,
  loadDemoOverview,
  loadOverview,
  loadWorkspace,
} from "../services/dashboard";
import {
  forgetSessionToken,
  persistSessionToken,
  readSessionToken,
  useSessionToken,
} from "../services/session";
import type { DataSourceMode, MonitorApp, Overview, RoleKey } from "../types";

const role = ref<RoleKey>("engineering");
const mode = ref<DataSourceMode>("demo");
const apps = ref<MonitorApp[]>(listDemoApps());
const appId = ref(DEFAULT_APP_ID);
const hours = ref(DEFAULT_HOURS);
const overview = ref<Overview | null>(
  loadDemoOverview(DEFAULT_APP_ID, DEFAULT_HOURS),
);
const loading = ref(false);
const loadError = ref("");
const lastUpdated = ref(Date.now());

/** 当前生效的令牌只用于发请求，不进入视图状态。 */
let sessionToken = "";
/** 请求序号：只有最后一次请求的结果会被采纳。 */
let requestSequence = 0;
/** 切换应用期间抑制 watch 触发的重复查询。 */
let syncingSelection = false;

const currentApp = computed(() =>
  apps.value.find((item) => item.appId === appId.value),
);
const data = computed(() => overview.value);
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

function reportError(error: unknown, fallback: string): void {
  loadError.value = error instanceof Error ? error.message : fallback;
}

/** 读取应用列表与聚合指标；成功后一次性应用新的数据源状态。 */
async function selectWorkspace(accessToken: string, preferredApp?: string) {
  const sequence = ++requestSequence;
  const previousToken = sessionToken;
  useSessionToken(accessToken);
  loading.value = true;
  loadError.value = "";
  try {
    const workspace = await loadWorkspace(preferredApp, hours.value);
    if (sequence !== requestSequence) return;
    syncingSelection = true;
    apps.value = workspace.apps;
    appId.value = workspace.appId;
    overview.value = workspace.overview;
    lastUpdated.value = Date.now();
    await nextTick();
    syncingSelection = false;
  } catch (error) {
    if (sequence === requestSequence) {
      reportError(error, "连接失败");
      useSessionToken(previousToken);
    }
    throw error;
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

/** 连接真实数据源，成功后才记入浏览器会话。 */
async function connect(accessToken: string): Promise<void> {
  await selectWorkspace(accessToken, appId.value);
  sessionToken = accessToken;
  persistSessionToken(accessToken);
  mode.value = "live";
}

/** 刷新当前应用与时间范围：演示模式重算样本，真实模式重新查询。 */
async function refresh(): Promise<void> {
  if (mode.value === "demo") {
    overview.value = loadDemoOverview(appId.value, hours.value);
    lastUpdated.value = Date.now();
    return;
  }
  if (!sessionToken || !appId.value) return;
  const sequence = ++requestSequence;
  loading.value = true;
  loadError.value = "";
  try {
    const result = await loadOverview(appId.value, hours.value);
    if (sequence === requestSequence) {
      overview.value = result;
      lastUpdated.value = Date.now();
    }
  } catch (error) {
    if (sequence === requestSequence) reportError(error, "刷新失败");
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

/** 回到演示数据源，并清除已保存的令牌。 */
function enterDemoMode(): void {
  ++requestSequence;
  mode.value = "demo";
  sessionToken = "";
  forgetSessionToken();
  apps.value = listDemoApps();
  appId.value = DEFAULT_APP_ID;
  overview.value = loadDemoOverview(appId.value, hours.value);
  loadError.value = "";
}

/** 启动时恢复浏览器会话中的令牌；失败时清空数据等待重新连接。 */
function restoreSession(): void {
  const stored = readSessionToken();
  if (!stored) return;
  sessionToken = stored;
  mode.value = "live";
  void selectWorkspace(stored, appId.value).catch(() => {
    overview.value = null;
  });
}

watch([appId, hours], () => {
  if (!syncingSelection) void refresh();
});

export function useDashboardStore() {
  return {
    role,
    mode,
    apps,
    appId,
    hours,
    loading,
    loadError,
    lastUpdated,
    currentApp,
    data,
    hasData,
    maxRoute,
    connect,
    refresh,
    enterDemoMode,
    restoreSession,
  };
}
