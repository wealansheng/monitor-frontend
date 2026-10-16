# Weils Monitor 工作台

Vue 3 + TypeScript + ECharts 监控大屏。业务应用通过 `weils-monitor` SDK 上报；`monitor-backend` 接收并保存事件，提供带令牌保护的只读聚合查询。管理平台本身不安装 SDK，也不采集自身事件。

## 启动

先启动 ClickHouse 和 `../monitor-backend`，在后端 `.env` 设置一个独立的 `MONITOR_DASHBOARD_TOKEN`。后端需完成 `npm run db:init`，以建好三张事件表。

```bash
npm install
npm run dev
```

默认访问 `http://localhost:8866`。Vite 将 `/api` 代理到 `http://localhost:8888`，也可用 `MONITOR_BACKEND_URL` 覆盖。首次进入显示明确标识的演示数据；点击“连接数据源”，输入后端的管理查询令牌，即可读取真实应用。令牌只保存在当前标签页的 `sessionStorage`，关闭标签页后失效，不会打包进代码。

生产部署需要将同源 `/api/v1/dashboard` 转发到后端，并在部署入口提供访问控制。不要将管理查询令牌放进 `VITE_` 环境变量。可复制 `.env.example` 配置开发代理的后端地址。业务应用的 SDK 上报仍由各自应用配置，管理平台不调用 `/api/v1/monitor`。

## 页面与数据

- **监控总览**：访问与错误共轴趋势、异常聚类、核心体验指标和热门页面；研发运维与产品运营可切换指标重点。
- **错误分析**：类型分布、错误指纹聚类、影响会话和最近发生时间。
- **性能体验**：LCP、INP、CLS、FCP、TTFB 的 P75 读数与 SDK 评级构成；请求及失败请求数量。
- **用户行为**：页面访问、去重访客、会话与热门路由。
- **事件明细**：最近 20 条事件，可按类型与关键字筛选。

应用和时间范围筛选作用于所有分析页面。真实数据模式每分钟自动刷新，在页面不可见时暂停。无事件、查询失败和演示模式都有独立状态。

后端接口定义见 [`../monitor-backend/README.md`](../monitor-backend/README.md)。访客数依赖 SDK 上报的 `user_id` 或 `session_id`；两者都为空时，页面访问仍会计数，但该访客不会进入去重人数。

## 构建

```bash
npm run build
npm run preview
```
