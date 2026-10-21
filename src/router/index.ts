import { createRouter, createWebHistory } from "vue-router";
import type { ViewKey } from "../types";
import { NAV_ITEMS } from "./nav";

const viewLoaders = {
  records: () => import('../views/RecordsView.vue'),
  overview: () => import("../views/OverviewView.vue"),
  errors: () => import("../views/ErrorsView.vue"),
  performance: () => import("../views/PerformanceView.vue"),
  behavior: () => import("../views/BehaviorView.vue"),
  events: () => import("../views/EventsView.vue"),
} satisfies Record<ViewKey, () => Promise<unknown>>;

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", redirect: { name: "overview" } },
    ...NAV_ITEMS.map((item) => ({
      path: item.path,
      name: item.key,
      component: viewLoaders[item.key],
    })),
    {
      path: '/records/:recordId',
      name: 'record-detail',
      component: () => import('../views/RecordDetailView.vue'),
      meta: { navKey: 'records', title: '操作回放', subtitle: '还原错误发生前后的操作与页面变化。' },
    },
    {
      path: "/events/:eventId",
      name: "event-detail",
      component: () => import("../views/EventDetailView.vue"),
      meta: {
        navKey: "events",
        title: "事件详情",
        subtitle: "查看单条事件上报的完整字段与上下文。",
      },
    },
    { path: "/:pathMatch(.*)*", redirect: { name: "overview" } },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
