<script setup lang="ts">
import { computed } from "vue";
import EChart from "../components/EChart.vue";
import { useDashboard } from "../composables/useDashboard";
import { formatNumber, formatTime, humanErrorType } from "../utils/format";

const { data: sourceData, errorOption } = useDashboard();
const data = computed(() => sourceData.value!);
</script>

<template>
  <section class="section-summary">
    <div>
      <span>错误事件</span
      ><strong>{{ formatNumber(data.summary.errors) }}</strong
      ><small>当前范围内全部错误</small>
    </div>
    <div>
      <span>稳定性异常</span
      ><strong>{{ formatNumber(data.summary.stabilityIssues) }}</strong
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
            ><strong>{{ issue.message || humanErrorType(issue.type) }}</strong
            ><small
              >{{ formatNumber(issue.count) }} 次 · 影响
              {{ formatNumber(issue.affectedSessions) }} 会话</small
            ></span
          ><span class="issue-time">{{ formatTime(issue.lastSeen) }}</span>
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
  </section>
</template>
