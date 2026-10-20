<script setup lang="ts">
import { computed } from "vue";
import { Activity, AlertCircle } from "@lucide/vue";
import EChart from "../components/EChart.vue";
import { useDashboard } from "../composables/useDashboard";
import { formatNumber, formatVital } from "../utils/format";

const { data: sourceData, vitalOption } = useDashboard();
const data = computed(() => sourceData.value!);
</script>

<template>
  <section class="section-summary">
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
            ><small>{{ formatNumber(vital.samples) }} 个样本</small></span
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
  </section>
</template>
