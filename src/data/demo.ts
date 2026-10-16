import type { MonitorApp, Overview } from "../types";

export const demoApps: MonitorApp[] = [
  {
    appId: "web-portal",
    projectName: "主站 Web",
    events: 26841,
    lastSeen: Date.now(),
  },
  {
    appId: "checkout",
    projectName: "交易流程",
    events: 9127,
    lastSeen: Date.now() - 180000,
  },
  {
    appId: "workspace",
    projectName: "用户工作台",
    events: 6372,
    lastSeen: Date.now() - 420000,
  },
];

export function makeDemo(appId = "web-portal", hours = 24): Overview {
  const to = Date.now();
  const from = to - hours * 3600000;
  const step = hours <= 24 ? 3600000 : 6 * 3600000;
  const count = Math.ceil((hours * 3600000) / step);
  const appFactor =
    appId === "checkout" ? 0.52 : appId === "workspace" ? 0.37 : 1;
  const timeline = Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index * 0.68) * 150 + Math.cos(index * 1.47) * 65;
    const rise = index > count * 0.58 && index < count * 0.81 ? 9 : 0;
    return {
      bucket: from + index * step,
      pageViews: Math.max(
        30,
        Math.round((730 + wave + index * 11) * appFactor),
      ),
      errors: Math.max(
        0,
        Math.round((3 + Math.sin(index * 0.9) * 2 + rise) * appFactor),
      ),
    };
  });
  const pageViews = timeline.reduce((sum, point) => sum + point.pageViews, 0);
  const errors = timeline.reduce((sum, point) => sum + point.errors, 0);
  const routeFactor = pageViews / 23681;
  const errorFactor = errors / 128;
  return {
    appId,
    from,
    to,
    hours,
    summary: {
      pageViews,
      visitors: Math.round(pageViews * 0.344),
      sessions: Math.round(pageViews * 0.413),
      errors,
      stabilityIssues: Math.round(errors * 0.1),
      requests: Math.round(pageViews * 7.08),
      failedRequests: Math.round(pageViews * 0.017),
    },
    timeline,
    vitals: [
      {
        metric: "LCP",
        p75: 2420,
        samples: 6581,
        good: 4511,
        needsImprovement: 1494,
        poor: 576,
      },
      {
        metric: "INP",
        p75: 168,
        samples: 5974,
        good: 4272,
        needsImprovement: 1370,
        poor: 332,
      },
      {
        metric: "CLS",
        p75: 0.084,
        samples: 6417,
        good: 4808,
        needsImprovement: 1160,
        poor: 449,
      },
      {
        metric: "FCP",
        p75: 1380,
        samples: 6742,
        good: 5230,
        needsImprovement: 1230,
        poor: 282,
      },
      {
        metric: "TTFB",
        p75: 640,
        samples: 6870,
        good: 5014,
        needsImprovement: 1466,
        poor: 390,
      },
    ],
    errorTypes: [
      { type: "http_error", count: 49 },
      { type: "js_error", count: 37 },
      { type: "resource_error", count: 21 },
      { type: "framework_error", count: 13 },
      { type: "promise_error", count: 8 },
    ].map((item) => ({ ...item, count: Math.round(item.count * errorFactor) })),
    issues: [
      {
        fingerprint: "1",
        message: "GET /api/orders 请求失败",
        type: "http_error",
        count: 34,
        affectedSessions: 22,
        lastSeen: to - 120000,
      },
      {
        fingerprint: "2",
        message: "Cannot read properties of undefined",
        type: "js_error",
        count: 26,
        affectedSessions: 18,
        lastSeen: to - 720000,
      },
      {
        fingerprint: "3",
        message: "主站首屏加载偏慢",
        type: "performance",
        count: 19,
        affectedSessions: 15,
        lastSeen: to - 1380000,
      },
      {
        fingerprint: "4",
        message: "页面白屏",
        type: "stability",
        count: 13,
        affectedSessions: 9,
        lastSeen: to - 2820000,
      },
      {
        fingerprint: "5",
        message: "图片资源加载失败",
        type: "resource_error",
        count: 11,
        affectedSessions: 10,
        lastSeen: to - 3480000,
      },
    ].map((item) => ({
      ...item,
      count: Math.round(item.count * errorFactor),
      affectedSessions: Math.round(item.affectedSessions * errorFactor),
    })),
    routes: [
      { route: "/", pageViews: 10842, visitors: 4931 },
      { route: "/products", pageViews: 5821, visitors: 3104 },
      { route: "/checkout", pageViews: 3274, visitors: 1879 },
      { route: "/account", pageViews: 2493, visitors: 1450 },
      { route: "/help", pageViews: 1251, visitors: 711 },
    ].map((item) => ({
      ...item,
      pageViews: Math.round(item.pageViews * routeFactor),
      visitors: Math.round(item.visitors * routeFactor),
    })),
    recentEvents: [
      {
        eventId: "demo-1",
        eventType: "error",
        timestamp: to - 120000,
        route: "/checkout",
        label: "GET /api/orders 请求失败",
        detail: "http_error",
      },
      {
        eventId: "demo-2",
        eventType: "behavior",
        timestamp: to - 180000,
        route: "/products",
        label: "page_view",
        detail: "",
      },
      {
        eventId: "demo-3",
        eventType: "performance",
        timestamp: to - 240000,
        route: "/",
        label: "LCP",
        detail: "needs-improvement",
      },
      {
        eventId: "demo-4",
        eventType: "error",
        timestamp: to - 300000,
        route: "/checkout",
        label: "Cannot read properties of undefined",
        detail: "js_error",
      },
      {
        eventId: "demo-5",
        eventType: "behavior",
        timestamp: to - 380000,
        route: "/account",
        label: "route_change",
        detail: "",
      },
      {
        eventId: "demo-6",
        eventType: "request",
        timestamp: to - 490000,
        route: "/products",
        label: "/api/products",
        detail: "",
      },
    ],
  };
}
