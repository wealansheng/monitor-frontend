<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import {
  Activity,
  AlertCircle,
  ArrowRight,
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
  Settings2,
  ShieldAlert,
  X,
} from "@lucide/vue";
import { useDashboard } from "./composables/useDashboard";
import { NAV_ITEMS, pageHeadFor } from "./router/nav";
import type { ViewKey } from "./types";
import { formatTime } from "./utils/format";

const navIcons: Record<ViewKey, typeof Activity> = {
  overview: LayoutDashboard,
  errors: ShieldAlert,
  performance: Activity,
  behavior: MousePointer2,
  events: BarChart3,
};
const route = useRoute();
const router = useRouter();
const {
  role,
  mode,
  tokenInput,
  apps,
  appId,
  hours,
  loading,
  connectOpen,
  connectError,
  loadError,
  lastUpdated,
  mobileNavOpen,
  setTokenField,
  currentApp,
  data,
  hasData,
  reload,
  connect,
  useDemo,
  openConnection,
  initializeDashboard,
  disposeDashboard,
} = useDashboard();

const head = computed(() => pageHeadFor(route.name, route.meta, role.value));
const view = computed<ViewKey>(() => head.value.navKey);
const isEventDetail = computed(() => route.name === "event-detail");

function navigate(key: ViewKey) {
  void router.push({ name: key });
  mobileNavOpen.value = false;
}

onMounted(initializeDashboard);
onBeforeUnmount(disposeDashboard);
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
          v-for="item in NAV_ITEMS"
          :key="item.key"
          class="nav-item"
          :class="{ active: view === item.key }"
          type="button"
          :aria-current="view === item.key ? 'page' : undefined"
          @click="navigate(item.key)"
        >
          <component
            :is="navIcons[item.key]"
            :size="18"
            :stroke-width="1.9"
          /><span>{{ item.label }}</span
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
          ><span class="breadcrumb-current">{{ head.title }}</span>
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
            <h1>{{ head.title }}</h1>
            <p>{{ head.subtitle }}</p>
          </div>
          <div class="head-actions">
            <button
              v-if="!isEventDetail"
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

        <div v-if="!isEventDetail && loading && !data" class="empty-state">
          <RefreshCw :size="28" class="spinning" />
          <h2>正在读取监控数据</h2>
          <p>聚合查询完成后会显示所选应用的指标。</p>
        </div>
        <div
          v-else-if="!isEventDetail && (!data || !hasData)"
          class="empty-state"
        >
          <Database :size="30" />
          <h2>当前范围内还没有监控事件</h2>
          <p>请确认 SDK 已上报，或切换应用与时间范围。</p>
          <button class="primary-button" type="button" @click="reload">
            重新查询
          </button>
        </div>

        <RouterView v-else />

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
          :ref="setTokenField"
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
