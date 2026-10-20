<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { ArrowRight, ArrowUpRight } from "@lucide/vue";
import EChart from "../components/EChart.vue";
import { useDashboard } from "../composables/useDashboard";
import type { ViewKey } from "../types";
import {
  formatNumber,
  formatShortTime,
  formatTime,
  formatVital,
  humanErrorType,
  percent,
} from "../utils/format";

const router = useRouter();
const {
  data: sourceData,
  role,
  hours,
  summaryMetrics,
  activePoint,
  signalBand,
  activeIndex,
  trendOption,
  maxRoute,
} = useDashboard();
const data = computed(() => sourceData.value!);
function navigate(key: ViewKey) {
  void router.push({ name: key });
}
</script>

<template>
  <section class="metric-strip" aria-label="关键指标">
    <div v-for="item in summaryMetrics" :key="item.label" class="metric-item">
      <div class="metric-label">
        <span>{{ item.label }}</span>
      </div>
      <div class="metric-value" :class="item.tone">
        {{ item.value }}<small v-if="item.unit">{{ item.unit }}</small>
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
            >{{ formatNumber(activePoint.pageViews) }} <small>PV</small></strong
          >
        </div>
        <div class="signal-measure error-measure">
          <span>错误事件</span
          ><strong
            >{{ formatNumber(activePoint.errors) }} <small>次</small></strong
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
            activeIndex === signalBand.peakIndex ? "错误峰值" : "错误抬升时段"
          }}</span
        >
      </div>
      <div class="chart-wrap trend-chart">
        <EChart :option="trendOption" label="页面访问和错误事件趋势图" />
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
          >{{ formatTime(data.from) }} — {{ formatTime(data.to) }}</span
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
          role === "engineering" ? data.issues.length : data.routes.length
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
            ><strong>{{ issue.message || humanErrorType(issue.type) }}</strong
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
        @click="navigate(role === 'engineering' ? 'errors' : 'behavior')"
      >
        {{ role === "engineering" ? "查看全部错误" : "查看页面分析" }}
        <ArrowRight :size="15" />
      </button>
    </section>
  </div>
  <div class="lower-grid" :class="{ 'product-grid': role === 'product' }">
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
          <strong>{{ formatVital(vital.metric, Number(vital.p75)) }}</strong>
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
        <button class="text-link" type="button" @click="navigate('behavior')">
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
