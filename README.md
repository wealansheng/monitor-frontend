# Weils Monitor 工作台

Vue 3 + TypeScript + ECharts 监控大屏。业务应用通过 `weils-monitor` SDK 上报；`monitor-backend` 接收并保存事件，提供带令牌保护的只读聚合查询。管理平台本身不安装 SDK，也不采集自身事件。

## 项目分层

| 目录                                    | 职责                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/router`                            | 路由元信息（`nav.ts`：标签、地址、页面说明）与 Vue Router 路由表，使用 `/overview` 等真实路径（HTML5 History 模式）                                    |
| `src/views`                             | 总览、错误、性能、行为、事件五个独立页面，按路由懒加载                                                                                                 |
| `src/components`                        | 可复用的 ECharts 图表组件                                                                                                                              |
| `src/charts`                            | 各页面的 ECharts 选项与数据序列配置                                                                                                                    |
| `src/composables`                       | 视图逻辑：筛选与交互状态、视图模型（指标卡、错误聚类、图表选项）、事件列表的防抖搜索与虚拟滚动、单条事件详情的读取，以及刷新与轮询生命周期             |
| `src/stores`                            | 工作台状态：数据源模式、应用、时间范围、加载与错误状态，以及连接、刷新、切换演示数据的动作；`events.ts` 负责事件列表的筛选、分页、已加载列表与滚动位置 |
| `src/services`                          | 业务编排：应用选择与聚合查询、事件列表分页与单条详情（`dashboard.ts`）、会话令牌的读写与生效（`session.ts`）                                           |
| `src/api`                               | Axios 实例、请求拦截器统一注入令牌、错误映射与后端查询接口                                                                                             |
| `src/data`、`src/types.ts`、`src/utils` | 演示数据、接口类型、展示格式化与事件详情的字段分组（`eventFields.ts`）                                                                                 |

依赖方向自上而下单向：`views → composables → stores → services → api`，`types`、`utils`、`data` 作为公共依赖被各层引用。只有 `src/services` 会接触演示数据，只有 `src/api` 会接触 Axios。

`src/App.vue` 负责工作台布局、导航、筛选和连接弹窗；路由页面只处理各自的展示。页面标题与导航高亮由路由 meta + `nav.ts` 的导航元信息推导，事件详情等子页面可以覆盖标题但仍归属「事件列表」。Axios 请求通过同源 `/api/v1/dashboard` 访问后端，`src/api/http.ts` 的请求拦截器统一注入 `Authorization` 头。聚合指标走 `/overview`，事件列表分页走 `/events`，单条事件详情走 `/event`（筛选、分页与详情都在服务端完成，不受 `/overview` 里“最近 20 条”窗口的限制）。

## 启动

先启动 ClickHouse 和 `../monitor-backend`，在后端 `.env` 设置一个独立的 `MONITOR_DASHBOARD_TOKEN`。后端需完成 `npm run db:init`，以建好三张事件表。

```bash
npm install
npm run dev
```

默认访问 `http://localhost:8866`。Vite 将 `/api` 代理到 `http://localhost:8888`，也可在 `.env.local` 中设置 `MONITOR_BACKEND_URL=https://xxx.xxxxxxx.xxx:8888` 指向线上后端（可从 `.env.example` 复制；修改后需重启开发服务器）。线上 8888 端口使用 HTTPS。首次进入显示明确标识的演示数据；点击“连接数据源”，输入后端的管理查询令牌，即可读取真实应用。令牌只保存在当前标签页的 `sessionStorage`，关闭标签页后失效，不会打包进代码。

生产部署需要将同源 `/api/v1/dashboard` 转发到后端，并在部署入口提供访问控制。路由使用 HTML5 History 模式：部署入口必须把所有未命中静态文件的路径重写到 `index.html`（例如 nginx `try_files $uri $uri/ /index.html;`），否则直接访问 `/errors` 等地址会 404；`npm run dev` 与 `npm run preview` 已内置该回退。若工作台部署在子路径下，需同时设置 Vite 的 `base`，路由会自动读取 `import.meta.env.BASE_URL`。不要将管理查询令牌放进 `VITE_` 环境变量。可复制 `.env.example` 配置开发代理的后端地址。业务应用的 SDK 上报仍由各自应用配置，管理平台不调用 `/api/v1/monitor`。

## 页面与数据

- **监控总览**：访问与错误共轴趋势、异常聚类、核心体验指标和热门页面；研发运维与产品运营可切换指标重点。
- **错误分析**：类型分布、错误指纹聚类、影响会话和最近发生时间。
- **性能体验**：LCP、INP、CLS、FCP、TTFB 的 P75 读数与 SDK 评级构成；请求及失败请求数量。
- **用户行为**：页面访问、去重访客、会话与热门路由。
- **事件列表**：服务端按类型与关键字筛选，列表用虚拟滚动按需加载（每页 50 条），错误等稀有类型不会再被近期高频事件挤出列表。
- **事件详情**（`/events/:eventId`）：点击列表任意一行进入（也可直接分享该地址）。顶部是与其它分析页一致的摘要条（事件类型 / 发生时间 / 数据表），下方按「类别字段 / 事件概览 / 会话环境 / 调试上下文」分组成 panel，字段以两列表格呈现，调用栈、面包屑与请求体用等宽代码块或格式化 JSON；空值字段、空的 JSON 容器与标记为「不适用」的 0 值不渲染，演示模式只展示样本中真实存在的字段。

应用和时间范围筛选作用于所有分析页面。真实数据模式每分钟自动刷新，在页面不可见时暂停。无事件、查询失败和演示模式都有独立状态。

后端接口定义见 [`../monitor-backend/README.md`](../monitor-backend/README.md)。访客数依赖 SDK 上报的 `user_id` 或 `session_id`；两者都为空时，页面访问仍会计数，但该访客不会进入去重人数。

## 构建

```bash
npm run build
npm run preview
```
# 错误源码定位

事件详情中的“源码定位”展示完整调用栈，默认选中首个已还原帧。可以切换调用帧查看原始源码路径、行列号、错误行前后各 5 行及构建位置；原始上报字段和调用栈继续保留。源码以纯文本展示，错误行及列位置高亮，长行可横向滚动。

连接工作台时继续使用 `MONITOR_DASHBOARD_TOKEN`。页面通过 `/api/v1/dashboard/errors/:eventId/symbolication?app_id=...` 查询结果，不配置或持有 `SOURCEMAP_ADMIN_TOKEN`，也不请求 `.map` 文件。演示模式不请求真实源码。定位失败可单独重试，不影响事件基本信息。

后端须先运行数据库迁移并部署新版接口；应用 SDK 的 `release` 和 map 上传版本必须一致。隐藏 map 必须保留 `sourcesContent`，私有上传到后端 `mapdata` 后才部署已清除 map 的应用产物。缺少版本、map 或源码内容时，页面会展示对应原因。

运行 `npm test` 验证帧切换、源码文本转义、失败重试及切换事件时的过期响应隔离；`npm run build` 验证类型与生产构建。
