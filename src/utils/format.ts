export function formatNumber(value: number | string | undefined): string {
  if (value === undefined || value === null) return "—";
  return Number(value).toLocaleString("zh-CN");
}
export function formatVital(metric: string, value: number): string {
  if (metric === "CLS") return value.toFixed(3);
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${Math.round(value)} ms`;
}
export function formatTime(value: number | string | undefined): string {
  if (!value) return "—";
  return new Date(Number(value)).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
/** 事件详情里的时间需要精确到秒，否则发生/接收/上报三个时间看起来完全一样。 */
export function formatDetailTime(value: number | string | undefined): string {
  if (!value) return "—";
  return new Date(Number(value)).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
export function formatRelativeTime(value: number | string | undefined): string {
  const ms = Number(value);
  if (!value || !Number.isFinite(ms)) return "—";
  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}
export function formatShortTime(value: number): string {
  return new Date(Number(value)).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function eventName(type: string): string {
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
export function humanErrorType(type: string): string {
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

export function percent(
  value: number | string,
  total: number | string,
): number {
  return Number(total) ? Math.round((Number(value) / Number(total)) * 100) : 0;
}
