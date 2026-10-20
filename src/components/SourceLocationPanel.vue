<script setup lang="ts">
import { computed } from "vue";
import type { MonitorEventDetail } from "../types";
import { useSymbolication } from "../composables/useSymbolication";

const props = defineProps<{ detail: MonitorEventDetail | null }>();
const { result, loading, error, selected, frame, reload, mode } =
  useSymbolication(() => props.detail);
const reasons: Record<string, string> = {
  mapped: "已还原",
  missing_release: "事件未配置 release",
  missing_map: "尚未上传对应版本的 map",
  no_mapping: "此位置没有源码映射",
  unsupported_frame: "此调用帧无法定位",
  invalid_map: "map 文件无法解析",
};
const rows = computed(
  () =>
    frame.value?.context?.lines.map((text, index) => {
      const line = frame.value!.context!.start_line + index;
      const active = line === frame.value?.original?.line;
      const column = active ? frame.value!.original!.column - 1 : -1;
      return {
        text,
        line,
        active,
        before: text.slice(0, column),
        character: text.slice(column, column + 1) || " ",
        after: text.slice(column + 1),
      };
    }) || [],
);
</script>

<template>
  <section
    v-if="detail?.event.event_type === 'error'"
    class="panel detail-panel source-panel"
    aria-labelledby="source-title"
    :aria-busy="loading"
  >
    <div class="panel-heading">
      <div>
        <h2 id="source-title">源码定位</h2>
        <p>按调用顺序查看源码位置与上下文</p>
      </div>
      <button
        v-if="mode === 'live'"
        class="outline-button"
        type="button"
        :disabled="loading"
        @click="reload"
      >
        {{ loading ? "正在定位…" : "重新定位" }}
      </button>
    </div>
    <p v-if="mode === 'demo'" class="source-message">
      演示模式不读取真实源码，连接数据服务后可查看。
    </p>
    <p v-else-if="loading" class="source-message" role="status">
      正在还原调用栈…
    </p>
    <p v-else-if="error" class="source-message source-error" role="alert">
      {{ error }}，可点击“重新定位”重试。
    </p>
    <template v-else-if="result?.frames.length">
      <p class="source-release">
        发布版本：{{ result.release || "未配置" }} ·
        {{ result.frames.filter((item) => item.status === "mapped").length }} /
        {{ result.frames.length }} 帧已还原
      </p>
      <div class="source-layout">
        <ol class="source-frames" aria-label="调用栈">
          <li v-for="(item, index) in result.frames" :key="index">
            <button
              type="button"
              :aria-pressed="selected === index"
              :class="{ 'source-frame-selected': selected === index }"
              @click="selected = index"
            >
              <strong
                >{{ index + 1 }}.
                {{ item.original?.name || item.label || "匿名函数" }}</strong
              >
              <span>{{
                item.original?.source || item.generated?.filename || item.raw
              }}</span>
              <small>{{ reasons[item.status] || item.status }}</small>
            </button>
          </li>
        </ol>
        <div v-if="frame" class="source-content">
          <template v-if="frame.original">
            <h3>
              {{ frame.original.source }}:{{ frame.original.line }}:{{
                frame.original.column
              }}
            </h3>
            <div
              v-if="rows.length"
              class="source-code"
              tabindex="0"
              role="region"
              aria-label="源码上下文，可横向滚动"
            >
              <div
                v-for="row in rows"
                :key="row.line"
                class="source-code-line"
                :class="{ 'source-error-line': row.active }"
                :aria-label="
                  row.active
                    ? `错误位置：第 ${row.line} 行，第 ${frame.original.column} 列`
                    : undefined
                "
              >
                <span class="source-line-number" aria-hidden="true">{{
                  row.line
                }}</span
                ><code
                  ><template v-if="row.active"
                    >{{ row.before }}<mark>{{ row.character }}</mark
                    >{{ row.after }}</template
                  ><template v-else>{{ row.text || " " }}</template></code
                >
              </div>
            </div>
            <p v-else class="source-message">
              已定位到源码位置，但 map 中缺少对应的源码内容。
            </p>
          </template>
          <p v-else class="source-message">
            {{ reasons[frame.status] || "此调用帧暂时无法还原" }}
          </p>
          <p v-if="frame.generated" class="source-generated">
            构建位置：{{ frame.generated.filename }}:{{
              frame.generated.line
            }}:{{ frame.generated.column }}
          </p>
          <pre v-if="frame.raw" class="source-raw">{{ frame.raw }}</pre>
        </div>
      </div>
    </template>
    <p v-else class="source-message">此事件没有可定位的调用栈或行列号。</p>
  </section>
</template>

<style scoped>
.source-panel {
  margin-bottom: 18px;
  padding: 23px 25px;
}
.source-panel .panel-heading {
  margin-bottom: 20px;
}
.source-layout {
  display: grid;
  grid-template-columns: minmax(200px, 30%) minmax(0, 1fr);
  gap: 24px;
}
.source-frames {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 420px;
  overflow: auto;
}
.source-frames button {
  width: 100%;
  padding: 12px;
  text-align: left;
  background: transparent;
  color: var(--ink);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}
.source-frames button:hover {
  background: #edf2ef;
}
.source-frames button.source-frame-selected {
  background: #e9f3ef;
  border-color: #257a74;
}
.source-frames strong,
.source-frames span,
.source-frames small {
  display: block;
  overflow-wrap: anywhere;
}
.source-frames span {
  margin: 6px 0;
}
.source-frames small,
.source-message,
.source-release,
.source-generated {
  color: var(--ink);
}
.source-release {
  margin: 0 0 18px;
}
.source-content {
  min-width: 0;
}
.source-content h3 {
  margin: 0 0 14px;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.source-code {
  overflow-x: auto;
  background: var(--ground);
  border-radius: 8px;
  padding: 12px 0;
  tab-size: 4;
}
.source-code-line {
  display: flex;
  width: max-content;
  min-width: 100%;
  font:
    12px/1.9 Consolas,
    monospace;
  white-space: pre;
}
.source-line-number {
  width: 5ch;
  padding: 0 14px;
  flex-shrink: 0;
  text-align: right;
  color: var(--ink);
  user-select: none;
  font-variant-numeric: tabular-nums;
}
.source-code code {
  padding-right: 18px;
  font: inherit;
}
.source-error-line {
  background: #fbebe6;
}
.source-error-line mark {
  background: #9c4b37;
  color: white;
}
.source-generated {
  margin: 16px 0 8px;
  overflow-wrap: anywhere;
  font-size: 12px;
}
.source-raw {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 12px;
}
.source-error {
  color: #9c4b37;
}
.source-panel button:focus-visible,
.source-code:focus-visible {
  outline: 3px solid #257a74;
  outline-offset: 2px;
}
.source-panel button:disabled {
  cursor: wait;
  opacity: 0.65;
}
.source-code ::selection {
  background: var(--line);
  color: var(--navy);
}
@media (max-width: 760px) {
  .source-panel {
    padding: 20px 17px;
  }
  .source-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
  .source-frames {
    max-height: 220px;
  }
}
</style>
