import { computed, type ComputedRef, type Ref } from "vue";
import type { EChartsOption } from "echarts";
import type { Overview, RoleKey, TimelinePoint } from "../types";
import {
  formatShortTime,
  formatTime,
  humanErrorType,
  percent,
} from "../utils/format";

interface SignalBand {
  start: number;
  end: number;
  peakIndex: number;
  peak: number;
}

interface ChartContext {
  data: ComputedRef<Overview | null>;
  hours: Ref<number>;
  role: Ref<RoleKey>;
  activePoint: ComputedRef<TimelinePoint | null>;
  activeIndex: Ref<number>;
  signalBand: ComputedRef<SignalBand | null>;
}

export function useChartOptions({
  data,
  hours,
  role,
  activePoint,
  activeIndex,
  signalBand,
}: ChartContext) {
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

  return { trendOption, errorOption, routesOption, vitalOption };
}
