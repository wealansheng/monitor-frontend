<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { RouterLink, useRouter } from "vue-router";
import { AlertCircle, ChevronDown, Search } from "@lucide/vue";
import { useEvents } from "../composables/useEvents";
import type { MonitorEvent } from "../types";
import { eventName, formatTime } from "../utils/format";

/** 虚拟列表参数：行高先取估计值，首屏渲染后按实际高度校正。 */
const DEFAULT_ROW_HEIGHT = 50;
const OVERSCAN = 8;
const LOAD_THRESHOLD_ROWS = 6;

const router = useRouter();
const {
  events,
  total,
  hasMore,
  loading,
  loadError,
  eventType,
  keyword,
  scrollTop,
  typeFilters,
  refreshEvents,
  loadMoreEvents,
  initializeEvents,
  disposeEvents,
} = useEvents();

const viewport = ref<HTMLDivElement>();
const viewportHeight = ref(0);
const rowHeight = ref(DEFAULT_ROW_HEIGHT);
let observer: ResizeObserver | undefined;

const visibleRows = computed(() => {
  const height = viewportHeight.value || 540;
  const first = Math.max(
    0,
    Math.floor(scrollTop.value / rowHeight.value) - OVERSCAN,
  );
  const size = Math.ceil(height / rowHeight.value) + OVERSCAN * 2;
  const items = events.value.slice(first, first + size);
  return {
    items,
    topPad: first * rowHeight.value,
    bottomPad: Math.max(
      0,
      (events.value.length - first - items.length) * rowHeight.value,
    ),
  };
});

function handleScroll() {
  const element = viewport.value;
  if (!element) return;
  scrollTop.value = element.scrollTop;
  if (
    hasMore.value &&
    !loading.value &&
    element.scrollTop + element.clientHeight >=
      element.scrollHeight - rowHeight.value * LOAD_THRESHOLD_ROWS
  ) {
    void loadMoreEvents();
  }
}

function measure() {
  const element = viewport.value;
  if (!element) return;
  viewportHeight.value = element.clientHeight;
  const row = element.querySelector<HTMLTableRowElement>("tr.event-row");
  const height = row?.getBoundingClientRect().height;
  if (height && Math.abs(height - rowHeight.value) > 0.5)
    rowHeight.value = height;
}

function openEvent(event: MonitorEvent) {
  void router.push({
    name: "event-detail",
    params: { eventId: event.eventId },
    query: { type: event.eventType },
  });
}

// 筛选重置或恢复位置时，把 store 里的滚动位置同步回 DOM。
watch(scrollTop, (value) => {
  const element = viewport.value;
  if (element && Math.abs(element.scrollTop - value) > 1) {
    element.scrollTop = value;
  }
});

onMounted(async () => {
  initializeEvents();
  const element = viewport.value;
  if (element) {
    observer = new ResizeObserver(measure);
    observer.observe(element);
  }
  await nextTick();
  measure();
  if (element && scrollTop.value) element.scrollTop = scrollTop.value;
});

onBeforeUnmount(() => {
  observer?.disconnect();
  disposeEvents();
});
</script>

<template>
  <section class="panel table-panel events-panel">
    <div class="panel-heading">
      <div>
        <h2>上报事件</h2>
        <p>按时间倒序，滚动加载；点击任意一行查看事件详情</p>
      </div>
      <div class="event-tools">
        <label class="search-box"
          ><Search :size="16" /><span class="sr-only">搜索事件</span
          ><input
            v-model="keyword"
            placeholder="搜索内容、路由或补充信息" /></label
        ><label class="event-select"
          ><span class="sr-only">事件类型</span
          ><select v-model="eventType">
            <option v-for="option in typeFilters" :key="option" :value="option">
              {{ option === "all" ? "全部类型" : eventName(option) }}
            </option></select
          ><ChevronDown :size="14"
        /></label>
      </div>
    </div>

    <div v-if="loadError" class="notice error-notice" role="alert">
      <AlertCircle :size="18" /><span>{{ loadError }}</span
      ><button type="button" @click="refreshEvents">重新查询</button>
    </div>

    <div
      v-if="events.length"
      ref="viewport"
      class="events-scroll"
      @scroll.passive="handleScroll"
    >
      <table class="events-table">
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
          <tr
            v-if="visibleRows.topPad"
            aria-hidden="true"
            :style="{ height: `${visibleRows.topPad}px` }"
          >
            <td colspan="5" class="spacer-cell" />
          </tr>
          <tr
            v-for="event in visibleRows.items"
            :key="event.eventId"
            class="event-row"
            @click="openEvent(event)"
          >
            <td>{{ formatTime(event.timestamp) }}</td>
            <td>
              <span class="event-type" :class="event.eventType">{{
                eventName(event.eventType)
              }}</span>
            </td>
            <td class="message-cell">
              <RouterLink
                class="event-link"
                :to="{
                  name: 'event-detail',
                  params: { eventId: event.eventId },
                  query: { type: event.eventType },
                }"
                @click.stop
                >{{ event.label || "未命名事件" }}</RouterLink
              >
            </td>
            <td>{{ event.route || "—" }}</td>
            <td class="muted-cell">{{ event.detail || "—" }}</td>
          </tr>
          <tr
            v-if="visibleRows.bottomPad"
            aria-hidden="true"
            :style="{ height: `${visibleRows.bottomPad}px` }"
          >
            <td colspan="5" class="spacer-cell" />
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="loading" class="panel-empty">正在读取事件…</div>
    <div v-else class="panel-empty">没有符合当前筛选的事件。</div>

    <div v-if="events.length" class="events-footer">
      <span>已加载 {{ events.length }} / 共 {{ total }} 条</span>
      <span v-if="loading">正在加载…</span>
      <span v-else-if="hasMore">继续向下滚动加载更多</span>
      <span v-else>已全部加载</span>
    </div>
  </section>
</template>
