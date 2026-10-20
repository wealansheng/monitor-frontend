<script setup lang="ts">
import { computed } from "vue";
import EChart from "../components/EChart.vue";
import { useDashboard } from "../composables/useDashboard";
import { formatNumber } from "../utils/format";

const { data: sourceData, routesOption } = useDashboard();
const data = computed(() => sourceData.value!);
</script>

<template>
  <section class="section-summary">
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
          ><strong :title="route.route">{{ route.route || "/" }}</strong
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
                  ? (Number(route.pageViews) / Number(route.visitors)).toFixed(
                      1,
                    )
                  : "—"
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
