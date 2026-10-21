---
version: 1
slug: "src-app-vue"
primary_target: "src/App.vue"
related_targets:
  - "src/router/nav.ts"
  - "src/views/EventDetailView.vue"
  - "src/views/RecordsView.vue"
  - "src/views/RecordDetailView.vue"
---

# 监控工作台

Mode: Operate. Scope: 主工作台及其数据分析页面。

Audience: 研发运维与产品运营；需要按应用、时间范围和角色视角查看同一监控数据。
Task: 先识别趋势和异常，再进入错误、性能、行为及事件明细；从错误详情继续查看源码和关联操作回放。
Content: `monitor-backend` 的真实聚合、事件、源码定位与录制查询；离线演示和合成录制必须明确标记。
Constraints: Vue 3、TypeScript、ECharts；桌面大屏与窄屏均可操作。

## Direction contract

THESIS: 观测图谱把访问、错误和体验指标放在可比较的时间语境中；首页拒绝互不关联的卡片堆叠。
OWN-WORLD: 深海蓝导航、浅矿物灰底、青绿主信号、赤陶异常信号。清晰的数据标签、细致的测绘色阶、低噪声图例贯穿各页。
STORY: 用户选应用和时间范围，先看整体运行，再从异常清单进入错误或性能，运营视角转向访问与热门页面。
FIRST VIEWPORT: 左侧固定导航与视角入口；顶部应用、时间筛选与数据状态；中央四项速读指标之下是一张占主导的访问/错误共轴趋势图；右侧是按严重程度排列的异常清单。窄屏先给趋势与首条异常，再顺序呈现其余内容。
FORM: 地质观测图与测绘图例，地面材料仅进入字体、色彩、密度和“信号层共轴”这一记忆点。方向种子 c7f238a9，第三个自建候选。
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Shipped scope

六个主导航页面为总览、错误、性能、行为、事件、操作回放。事件详情归属事件导航，录制详情归属操作回放导航；共享应用、数据源模式与管理查询令牌。普通聚合、源码定位和录制读取保留各自的加载、空态及重试入口。

录制检查沿用现有设计系统，其暂停初始状态、外置控件、窄屏容纳与错误定位规则见 [replay surface](replay.md)。产品范围见 [PRODUCT.md](../../PRODUCT.md)，启动与部署见 [README.md](../../README.md)。
