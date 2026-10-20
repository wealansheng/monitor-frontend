// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import SourceLocationPanel from "./SourceLocationPanel.vue";
import { loadSymbolication as getSymbolication } from "../services/dashboard";
import { useDashboardStore } from "../stores/dashboard";
import type { MonitorEventDetail, SymbolicationResult } from "../types";

vi.mock("../services/dashboard", () => ({ loadSymbolication: vi.fn() }));
vi.mock("../stores/dashboard", () => {
  const store = { mode: ref("live"), appId: ref("app") };
  return { useDashboardStore: () => store };
});

const detail = (eventId = "event-a"): MonitorEventDetail => ({
  appId: "app",
  eventId,
  category: "error",
  event: { event_type: "error" },
});
const result = (event_id = "event-a"): SymbolicationResult => ({
  event_id,
  app_id: "app",
  release: "v1",
  stack: "raw stack",
  status: "partial",
  frames: [
    { raw: "at native", label: "native", status: "unsupported_frame" },
    {
      raw: "at render (app.js:1:3)",
      label: "render",
      status: "mapped",
      generated: { filename: "https://cdn.test/app.js", line: 1, column: 3 },
      original: { source: "src/app.vue", line: 2, column: 3 },
      context: {
        start_line: 1,
        lines: [
          "before",
          '  <img src=x onerror="window.hacked=true">',
          "after",
        ],
      },
    },
    {
      raw: "at caller",
      label: "caller",
      status: "mapped",
      original: { source: "src/caller.ts", line: 7, column: 1 },
    },
  ],
});
const mounted: ReturnType<typeof mount>[] = [];
function render() {
  const wrapper = mount(SourceLocationPanel, { props: { detail: detail() } });
  mounted.push(wrapper);
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  useDashboardStore().mode.value = "live";
  useDashboardStore().appId.value = "app";
});
afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount());
});

describe("源码定位", () => {
  it("默认选中首个已还原帧，显示行列及纯文本源码，并可切换帧", async () => {
    vi.mocked(getSymbolication).mockResolvedValue(result());
    const wrapper = render();
    await flushPromises();
    expect(wrapper.get("h3").text()).toBe("src/app.vue:2:3");
    expect(wrapper.get("mark").text()).toBe("<");
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.text()).toContain("<img src=x");
    expect(
      wrapper.get(".source-error-line").attributes("aria-label"),
    ).toContain("第 2 行，第 3 列");
    await wrapper.findAll(".source-frames button")[0]!.trigger("click");
    expect(wrapper.text()).toContain("此调用帧无法定位");
    await wrapper.findAll(".source-frames button")[2]!.trigger("click");
    expect(wrapper.text()).toContain("map 中缺少对应的源码内容");
  });

  it("展示加载和失败状态，并支持重试", async () => {
    vi.mocked(getSymbolication)
      .mockRejectedValueOnce(new Error("无权限"))
      .mockResolvedValueOnce(result());
    const wrapper = render();
    expect(wrapper.text()).toContain("正在还原调用栈");
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("无权限");
    await wrapper.get(".outline-button").trigger("click");
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.get("h3").text()).toContain("src/app.vue");
  });

  it("快速切换事件时清空旧内容，忽略过期响应", async () => {
    let resolveOld!: (value: SymbolicationResult) => void;
    vi.mocked(getSymbolication)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
      )
      .mockResolvedValueOnce(result("event-b"));
    const wrapper = render();
    await wrapper.setProps({ detail: detail("event-b") });
    await flushPromises();
    resolveOld({
      ...result(),
      frames: [{ raw: "old", label: "OLD RESPONSE", status: "missing_map" }],
    });
    await flushPromises();
    expect(wrapper.text()).not.toContain("OLD RESPONSE");
    expect(wrapper.get("h3").text()).toContain("src/app.vue");
    await wrapper.setProps({ detail: null });
    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("演示模式和非错误事件不请求源码，切换到演示后旧请求失效", async () => {
    useDashboardStore().mode.value = "demo";
    const wrapper = render();
    await flushPromises();
    expect(getSymbolication).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("演示模式不读取真实源码");
    await wrapper.setProps({
      detail: {
        ...detail(),
        category: "behavior",
        event: { event_type: "behavior" },
      },
    });
    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("空调用栈有明确提示，应用变化后不保留上一应用源码", async () => {
    vi.mocked(getSymbolication).mockResolvedValue({ ...result(), frames: [] });
    const wrapper = render();
    await flushPromises();
    expect(wrapper.text()).toContain("没有可定位的调用栈");
    useDashboardStore().appId.value = "another-app";
    await flushPromises();
    expect(wrapper.find("h3").exists()).toBe(false);
    expect(getSymbolication).toHaveBeenCalledTimes(1);
  });

  it("切换演示模式后忽略尚未完成的真实源码响应", async () => {
    let finish!: (value: SymbolicationResult) => void;
    vi.mocked(getSymbolication).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const wrapper = render();
    useDashboardStore().mode.value = "demo";
    finish(result());
    await flushPromises();
    expect(wrapper.find("h3").exists()).toBe(false);
    expect(wrapper.text()).toContain("演示模式不读取真实源码");
  });
});
