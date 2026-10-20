import { createRouter, createWebHistory } from "vue-router";
import type { ViewKey } from "../types";
import { NAV_ITEMS } from "./nav";

const viewLoaders = {
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
