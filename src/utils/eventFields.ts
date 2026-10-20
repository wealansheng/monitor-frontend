import type { EventCategory } from "../types";
import { eventName, formatDetailTime, formatRelativeTime } from "./format";

type FieldKind =
  | "text"
  | "time"
  | "datetime"
  | "json"
  | "code"
  | "bytes"
  | "duration"
  | "boolean";

interface FieldSpec {
  key: string;
  label: string;
  kind?: FieldKind;
  /** 该字段为 0 表示未采集或不适用，详情页不展示。 */
  hideWhenZero?: boolean;
}

export interface DetailField {
  key: string;
  label: string;
  value: string;
  multiline: boolean;
}

export interface DetailGroup {
  title: string;
  description: string;
  fields: DetailField[];
}

export interface SummaryItem {
  label: string;
  value: string;
  note: string;
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  error: "错误表",
  behavior: "行为表",
  performance: "性能表",
};

const CATEGORY_DESCRIPTIONS: Record<EventCategory, string> = {
  error: "该错误上报的详细信息与调用栈",
  behavior: "该行为事件的属性与目标",
  performance: "该性能、请求或资源事件的指标与耗时",
};

const OVERVIEW_FIELDS: FieldSpec[] = [
  { key: "event_id", label: "事件 ID" },
  { key: "event_type", label: "事件类型" },
  { key: "timestamp", label: "发生时间", kind: "time" },
  { key: "received_at", label: "接收时间", kind: "datetime" },
  { key: "app_id", label: "应用 ID" },
  { key: "project_name", label: "项目名称" },
  { key: "route", label: "路由" },
  { key: "page_url", label: "页面地址" },
  { key: "referrer", label: "来源页面" },
  { key: "release", label: "版本" },
  { key: "environment", label: "环境" },
  { key: "sample_rate", label: "采样率" },
  { key: "send_time", label: "上报时间", kind: "time" },
  { key: "trace_id", label: "链路 ID" },
];

const CONTEXT_FIELDS: FieldSpec[] = [
  { key: "user_id", label: "用户" },
  { key: "session_id", label: "会话" },
  { key: "device_type", label: "设备类型" },
  { key: "device_model", label: "设备型号" },
  { key: "browser_name", label: "浏览器" },
  { key: "browser_version", label: "浏览器版本" },
  { key: "os_name", label: "操作系统" },
  { key: "os_version", label: "系统版本" },
  { key: "network", label: "网络" },
  { key: "locale", label: "语言" },
  { key: "screen", label: "屏幕" },
  { key: "viewport", label: "视口" },
  { key: "sdk_version", label: "SDK 版本" },
  { key: "client_ip", label: "客户端 IP" },
  { key: "user_agent", label: "User-Agent" },
];

const DEBUG_FIELDS: FieldSpec[] = [
  { key: "breadcrumbs", label: "面包屑", kind: "json" },
  { key: "props", label: "组件属性", kind: "json" },
  { key: "tags", label: "标签", kind: "json" },
  { key: "extra", label: "附加信息", kind: "json" },
  { key: "properties", label: "行为属性", kind: "json" },
  { key: "request_body", label: "请求内容", kind: "code" },
  { key: "response_body", label: "响应内容", kind: "code" },
];

const CATEGORY_FIELDS: Record<EventCategory, FieldSpec[]> = {
  error: [
    { key: "error_type", label: "错误类型" },
    { key: "issue_type", label: "稳定性类型" },
    { key: "message", label: "错误信息", kind: "code" },
    { key: "name", label: "错误名称" },
    { key: "reason", label: "拒绝原因", kind: "code" },
    { key: "stack", label: "调用栈", kind: "code" },
    { key: "stack_frames", label: "结构化调用栈", kind: "json" },
    { key: "component", label: "组件" },
    { key: "component_stack", label: "组件栈", kind: "code" },
    { key: "filename", label: "文件" },
    { key: "lineno", label: "行号", hideWhenZero: true },
    { key: "colno", label: "列号", hideWhenZero: true },
    { key: "url", label: "请求地址" },
    { key: "method", label: "请求方法" },
    { key: "status_code", label: "状态码", hideWhenZero: true },
    { key: "duration", label: "耗时", kind: "duration", hideWhenZero: true },
    { key: "resource_url", label: "资源地址" },
    { key: "resource_type", label: "资源类型" },
    { key: "tag_name", label: "标签名" },
    { key: "fingerprint", label: "自定义指纹" },
    { key: "fingerprint_hash", label: "聚类指纹" },
    {
      key: "blank_time",
      label: "白屏时长",
      kind: "duration",
      hideWhenZero: true,
    },
    { key: "root_node_count", label: "根节点数", hideWhenZero: true },
  ],
  behavior: [
    { key: "action", label: "行为" },
    { key: "category", label: "行为分类" },
    {
      key: "duration",
      label: "停留 / 耗时",
      kind: "duration",
      hideWhenZero: true,
    },
    { key: "from_route", label: "来源路由" },
    { key: "to_route", label: "目标路由" },
    { key: "target_selector", label: "目标选择器" },
    { key: "target_text", label: "目标文本" },
    { key: "target_tag", label: "目标标签" },
  ],
  performance: [
    { key: "metric_name", label: "指标 / 资源" },
    { key: "value", label: "指标值" },
    { key: "rating", label: "评级" },
    { key: "start_time", label: "开始时间", kind: "duration" },
    { key: "duration", label: "耗时", kind: "duration", hideWhenZero: true },
    { key: "dns", label: "DNS", kind: "duration" },
    { key: "tcp", label: "TCP", kind: "duration" },
    { key: "ssl", label: "SSL", kind: "duration" },
    { key: "request", label: "请求耗时", kind: "duration" },
    { key: "response", label: "响应耗时", kind: "duration" },
    { key: "dom_ready", label: "DOM Ready", kind: "duration" },
    { key: "load", label: "加载耗时", kind: "duration" },
    { key: "name", label: "资源名称" },
    { key: "initiator_type", label: "发起类型" },
    {
      key: "transfer_size",
      label: "传输大小",
      kind: "bytes",
      hideWhenZero: true,
    },
    {
      key: "encoded_body_size",
      label: "解码后大小",
      kind: "bytes",
      hideWhenZero: true,
    },
    { key: "url", label: "请求地址" },
    { key: "method", label: "请求方法" },
    { key: "status_code", label: "状态码", hideWhenZero: true },
    {
      key: "request_size",
      label: "请求大小",
      kind: "bytes",
      hideWhenZero: true,
    },
    {
      key: "response_size",
      label: "响应大小",
      kind: "bytes",
      hideWhenZero: true,
    },
    { key: "success", label: "请求成功", kind: "boolean" },
    { key: "cached", label: "命中缓存", kind: "boolean" },
    { key: "status", label: "资源状态码", hideWhenZero: true },
    { key: "resource_url", label: "资源地址" },
    { key: "resource_type", label: "资源类型" },
  ],
};

const CATEGORY_TITLES: Record<EventCategory, string> = {
  error: "错误信息",
  behavior: "行为信息",
  performance: "性能信息",
};

function parseClickHouseTime(value: string): number | null {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)
    ? normalized
    : `${normalized}Z`;
  const ms = Date.parse(withZone);
  return Number.isNaN(ms) ? null : ms;
}

function formatJson(raw: unknown): string {
  if (typeof raw !== "string") return JSON.stringify(raw, null, 2);
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function formatDuration(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return `${value >= 100 ? Math.round(value) : Number(value.toFixed(2))} ms`;
}

function formatValue(kind: FieldKind, raw: unknown): string {
  switch (kind) {
    case "time": {
      const ms = Number(raw);
      return Number.isFinite(ms) && ms > 0 ? formatDetailTime(ms) : String(raw);
    }
    case "datetime": {
      const ms = parseClickHouseTime(String(raw));
      return ms === null ? String(raw) : formatDetailTime(ms);
    }
    case "json":
      return formatJson(raw);
    case "bytes":
      return formatBytes(Number(raw));
    case "duration":
      return formatDuration(Number(raw));
    case "boolean":
      return Number(raw) ? "是" : "否";
    default:
      return String(raw);
  }
}

function isEmptyJson(raw: unknown): boolean {
  if (raw === undefined || raw === null || raw === "") return true;
  if (typeof raw !== "string") {
    return typeof raw === "object" && Object.keys(raw).length === 0;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null) return true;
    return typeof parsed === "object" && Object.keys(parsed).length === 0;
  } catch {
    return false;
  }
}

function isEmptyValue(raw: unknown, kind: FieldKind): boolean {
  if (kind === "json") return isEmptyJson(raw);
  if (raw === undefined || raw === null || raw === "") return true;
  if (typeof raw === "object") return Object.keys(raw).length === 0;
  return false;
}

function toDetailField(spec: FieldSpec, raw: unknown): DetailField | null {
  const kind = spec.kind ?? "text";
  if (spec.hideWhenZero && Number(raw) === 0) return null;
  if (isEmptyValue(raw, kind)) return null;
  return {
    key: spec.key,
    label: spec.label,
    value: formatValue(kind, raw),
    multiline: kind === "json" || kind === "code",
  };
}

function isDetailField(field: DetailField | null): field is DetailField {
  return field !== null;
}

/** 错误事件把错误信息作为分组副标题，便于一眼看到出错原因。 */
function categoryDescription(
  event: Record<string, unknown>,
  category: EventCategory,
): string {
  if (category !== "error") return CATEGORY_DESCRIPTIONS[category];
  const message = String(event.message ?? "").trim();
  if (!message) return CATEGORY_DESCRIPTIONS[category];
  return message.length > 140 ? `${message.slice(0, 139)}…` : message;
}

/**
 * 按「当前类别 → 概览 → 环境 → 调试上下文 → 其他」组织字段：
 * 类别字段是排查时最先要看的内容。
 * 空值、空的 JSON 容器以及标记为“不适用”的 0 值不展示；
 * 未登记的字段进入「其他字段」，便于 schema 演进。
 */
export function buildEventDetailGroups(
  event: Record<string, unknown>,
  category: EventCategory,
): DetailGroup[] {
  const planned = [
    {
      title: CATEGORY_TITLES[category],
      description: categoryDescription(event, category),
      specs: CATEGORY_FIELDS[category],
    },
    {
      title: "事件概览",
      description: "事件标识、时间与所属应用",
      specs: OVERVIEW_FIELDS,
    },
    {
      title: "应用与会话环境",
      description: "上报时的浏览器、设备与网络环境",
      specs: CONTEXT_FIELDS,
    },
    {
      title: "调试上下文",
      description: "随事件上报的面包屑、标签与请求内容",
      specs: DEBUG_FIELDS,
    },
  ];
  const known = new Set(
    planned.flatMap(({ specs }) => specs.map((spec) => spec.key)),
  );
  const groups: DetailGroup[] = planned.map(
    ({ title, description, specs }) => ({
      title,
      description,
      fields: specs
        .map((spec) => toDetailField(spec, event[spec.key]))
        .filter(isDetailField),
    }),
  );

  const rest = Object.keys(event)
    .filter((key) => !known.has(key))
    .map((key) => toDetailField({ key, label: key }, event[key]))
    .filter(isDetailField);
  if (rest.length) {
    groups.push({
      title: "其他字段",
      description: "本次上报中未归类的字段",
      fields: rest,
    });
  }

  return groups.filter((group) => group.fields.length > 0);
}

/** 详情页顶部的摘要条，与其它分析页共用 `.section-summary` 样式。 */
export function buildEventSummary(
  event: Record<string, unknown>,
  category: EventCategory,
): SummaryItem[] {
  const eventType = String(event.event_type ?? "");
  const timestamp = Number(event.timestamp ?? 0);
  return [
    {
      label: "事件类型",
      value: eventName(eventType),
      note: eventType || "—",
    },
    {
      label: "发生时间",
      value: formatRelativeTime(timestamp),
      note: timestamp > 0 ? formatDetailTime(timestamp) : "—",
    },
    {
      label: "数据表",
      value: CATEGORY_LABELS[category],
      note: summaryNote(event, category),
    },
  ];
}

function summaryNote(
  event: Record<string, unknown>,
  category: EventCategory,
): string {
  if (category === "error") {
    const fingerprint = event.fingerprint_hash;
    if (fingerprint !== undefined && fingerprint !== "") {
      return `聚类指纹 ${String(fingerprint)}`;
    }
    return String(event.error_type || "—");
  }
  if (category === "behavior") {
    const action = String(event.action || "—");
    const target = String(event.target_selector || event.to_route || "");
    return target ? `${action} · ${target}` : action;
  }
  const name = String(
    event.metric_name || event.url || event.resource_url || "—",
  );
  const value = event.value;
  return value === undefined || value === ""
    ? name
    : `${name} · ${String(value)}`;
}
