import type { RoleKey, ViewKey } from "../types";

export interface NavItem {
  key: ViewKey;
  path: string;
  label: string;
  subtitle: (role: RoleKey) => string;
}

/** 导航与路由元信息的唯一来源：标签、地址和页面说明都在这里维护。 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "overview",
    path: "/overview",
    label: "监控总览",
    subtitle: (role) =>
      role === "engineering"
        ? "观察系统信号，定位影响体验的变化。"
        : "了解访问与体验变化，找到值得跟进的页面。",
  },
  {
    key: "errors",
    path: "/errors",
    label: "错误分析",
    subtitle: () => "按类型与影响范围查看近期异常。",
  },
  {
    key: "performance",
    path: "/performance",
    label: "性能体验",
    subtitle: () => "观察核心体验指标和采样质量。",
  },
  {
    key: "behavior",
    path: "/behavior",
    label: "用户行为",
    subtitle: () => "理解页面访问与用户路径。",
  },
  {
    key: "events",
    path: "/events",
    label: "事件列表",
    subtitle: () => "按类型与关键字筛选上报事件，点击任意一行查看详情。",
  },
];

const navByKey = new Map(NAV_ITEMS.map((item) => [item.key, item]));

export function navItem(key: ViewKey): NavItem {
  return navByKey.get(key) ?? NAV_ITEMS[0]!;
}

/** 把路由名收敛为受支持的页面标识，未知地址回退到总览。 */
export function viewFromRouteName(name: unknown): ViewKey {
  return typeof name === "string" && navByKey.has(name as ViewKey)
    ? (name as ViewKey)
    : "overview";
}

function isViewKey(value: unknown): value is ViewKey {
  return typeof value === "string" && navByKey.has(value as ViewKey);
}

interface RouteMetaShape {
  navKey?: ViewKey;
  title?: string;
  subtitle?: string;
}

export interface PageHead {
  navKey: ViewKey;
  title: string;
  subtitle: string;
}

/**
 * 由路由名与路由 meta 推导页面标题：
 * 子页面（如事件详情）可用 meta 覆盖标题，同时仍高亮所属导航项。
 */
export function pageHeadFor(
  name: unknown,
  meta: unknown,
  role: RoleKey,
): PageHead {
  const custom = (meta ?? {}) as RouteMetaShape;
  const navKey = isViewKey(custom.navKey)
    ? custom.navKey
    : viewFromRouteName(name);
  const item = navItem(navKey);
  return {
    navKey,
    title: typeof custom.title === "string" ? custom.title : item.label,
    subtitle:
      typeof custom.subtitle === "string"
        ? custom.subtitle
        : item.subtitle(role),
  };
}
