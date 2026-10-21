---
version: 1
slug: "replay"
primary_target: "src/views/RecordDetailView.vue"
related_targets:
  - "src/views/RecordsView.vue"
  - "src/components/ErrorReplayPanel.vue"
  - "src/replay.css"
  - "src/router/nav.ts"
---

# 操作回放

Mode: Operate. Ordinary extension of the Observability Atlas recorded in `DESIGN.md`; no new visual world or system tokens.

Audience: 研发运维人员定位错误前后的页面与操作。
Task: 从独立操作回放列表筛选录制，或从错误详情打开关联片段，再定位错误时间点。
Content: 应用与时间范围内的录制摘要、完整性状态、用户/会话、页面路由、回放画面与错误标记；合成演示明确标识。
Constraints: Vue 3 and the shared replay player; paused initial state, sandboxed replay, external playback controls, narrow-screen inspection without page-level overflow.

## Direction contract

THESIS: 错误片段与操作现场在同一工作台中可追溯；列表入口与错误关联入口共用一个播放器。
OWN-WORLD: 继承深海蓝导航、矿物灰底、白色分析面板、青绿操作与赤陶异常语义；不改变根设计系统。
STORY: 选择应用与时间范围，筛选用户/会话/路由，查看片段状态，打开回放；错误详情入口将播放位置定位到关联错误。播放与拖动由用户主动控制。
FIRST VIEWPORT: 列表先呈现标题、筛选与录制表格；详情先交代路由、时间和身份，再提供回放画面。演示标识与上下文不足提示位于画面外，播放、时间、进度、速度和尺寸控件位于画面下方。
FORM: 沿用观测图谱的分析面板；录制画面是被观察的内容，不作为工作台的新样式来源。

## Shipped evidence

- `src/style.css` supplies the incumbent navy/mineral palette, serif section titles, sans controls, 14px panels, 8px controls, quiet borders and ambient elevation. `src/replay.css` reuses those values rather than adding a palette or type family.
- The replay panel uses the existing desktop inset (23px 25px), reducing to 20px 17px at 640px. Filters wrap to full-width fields on phones; the recording table inherits horizontal scrolling. Controls wrap and move the progress range to its own row.
- The viewport fits the recorded frame by default. Actual size, 150% and 200% use a focusable scroll viewport capped at 60vh; controls remain outside it. This containment is a replay-specific interaction rule, not a global container rule.
- Playback starts paused; seeking also pauses. Error links carry the event identity and seek to its timestamp. Speed choices are 0.5×, 1×, 2× and 4×.
- Demo notices explicitly identify synthetic content. Loading, query failure/retry, empty results, incomplete/corrupt recordings and insufficient context remain visible in the relevant panel.
- `ErrorReplayPanel.vue` reuses the existing detail panel and outline links. `router/nav.ts` adds the operation-replay destination to the incumbent rail.

## System boundary

The existing visual tokens and `.impeccable/design.json` remain unchanged. `DESIGN.md` documents the shipped replay inspection rules without introducing a new visual system. The extension supports the Signal Role Rule through teal controls and terracotta error context, and the Numeric Scan Rule through tabular playback time and pagination. Existing button-weight and sidecar inconsistencies are incumbent drift, not new replay tokens or approved corrections. No defect or drift is canonized here.

Operational behavior, backend dependencies and troubleshooting are maintained in [the replay guide](../../docs/replay.md). Product scope is recorded in [PRODUCT.md](../../PRODUCT.md).
