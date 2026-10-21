# 操作回放

侧栏「操作回放」按应用、时间、用户、会话与路由筛选错误录制。进入详情后懒加载 SDK 的独立播放入口；错误详情中的「操作回放」区域按错误 UUID 查询，跳转后自动定位该错误时间点。

工作台只读取和播放已有片段，不采集或上传自身操作。录制来自业务应用的 SDK；通用接入默认关闭，本地 Vue/Nuxt 示例默认开启并保存错误前 10 秒、后 5 秒。录制条件、上传回执与三项目启动顺序见 [SDK 联调指南](../../weils-monitor/docs/replay.md)。

## 页面与读取流程

| 入口 | 行为 |
| --- | --- |
| `/records` | 应用与时间范围内的录制列表，用户 ID、会话 ID、路由均精确匹配，20 条一页 |
| `/records/:recordId` | 先查详情与状态，再每次读取 4 片；所有分片到达后校验并创建播放器 |
| `/events/:eventId` 的「操作回放」 | 对错误表事件查询同应用、同错误 UUID 的关联录制；固定近 30 天 |
| `/records/:recordId?error=<事件UUID>` | 初始定位到录制中匹配的错误时间点，保持暂停 |

录制 ID 与错误 ID 是不同 UUID。打开录制前先选择正确应用；后端按 `app_id` 隔离，其他应用下的同一录制 ID 会返回不存在。列表时间范围按录制 `started_at` 筛选；详情不依赖顶部时间范围。错误详情查询关联录制时，可能需等待后置窗口和上传完成后点击「重新查询」。

播放器默认暂停，支持拖动进度、0.5/1/2/4 倍速、错误时间按钮和自适应画面。窄屏可改选实际大小或放大，并在画面内横向/纵向滚动；播放控制始终在录制画面之外。切换录制、应用或离开页面时取消请求并销毁播放器。

数据依赖 `monitor-backend` 新增的 `/api/v1/dashboard/records` 接口及同一管理令牌。普通聚合事件为空时仍可使用回放列表。缺片、损坏、过期和无关联录制分别显示状态或恢复操作；演示模式使用明确标记的合成 DOM 录制。

列表显示 `complete` 为「可播放」、`incomplete` 为「等待分片」、`corrupt` 为「录制损坏」。后端完整性判断不代替浏览器解码校验；编码损坏仍会显示读取失败。`context_missing` 或非正常结束原因会显示前后文不足提示，不隐藏已保留的可恢复内容。

## 本地运行

前端依赖指向同级 SDK 的 `@weils-monitor/replay` 包，因此先构建 SDK：

```bash
cd ../weils-monitor
pnpm install
pnpm build
cd ../monitor-frontend
npm install
npm run dev
```

发布到独立工作区前，将 `file:../weils-monitor/packages/replay` 替换为已发布的新包版本，或确保 CI 同样检出同级 SDK 并先构建。无需把管理令牌写入构建变量；使用已有连接设置。

先在后端运行 `npm run db:init`，确保 `event_record` 存在且运行账号有 SELECT/INSERT 权限。工作台默认访问 8866，开发/预览代理目标由 `MONITOR_BACKEND_URL` 控制，默认 `http://localhost:8888`；该变量不带 `VITE_` 前缀，不是业务 SDK 上传地址。部署静态站点时仍需提供 `/api/v1/dashboard` 反向代理与 HTML5 History 回退，支持直接访问录制详情。

## 接口与权限

以下路径均相对于 `/api/v1/dashboard`，要求 `app_id` 与 `Authorization: Bearer <MONITOR_DASHBOARD_TOKEN>`，响应不缓存：

| 路径 | 数据 |
| --- | --- |
| `GET /records` | `records`、`total`、`limit`、`offset`、`hasMore`，不含 payload |
| `GET /records/:recordId` | `record` 元信息、状态和已收片数 |
| `GET /records/:recordId/chunks` | `chunks`、`total`、`hasMore`，完整录制才允许读取 |
| `GET /errors/:eventId/records` | 近 30 天关联的 `records`、`total`，默认最多 20 条，可用 limit/offset 分页 |

前端在 `src/api/records.ts` 封装这些请求，沿用当前标签页的查询令牌。未配置后端查询令牌时接口返回 404，错误令牌返回 401；不需要 Source Map 上传令牌。详细参数与数据限制见 [后端 Replay 协议](../../monitor-backend/docs/replay.md)。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 只看到合成演示 | 点击「连接数据源」，输入后端管理查询令牌，选择业务应用 |
| 普通事件有数据但没有录制 | 检查 SDK 录制开关、会话采样和受支持错误，等待后置窗口结束及上传成功；普通点击不会生成片段 |
| 上传完成但列表为空 | 选择相同 `app_id`，检查时间范围，清空用户、会话及路由的精确筛选 |
| 401 / 404 | 重新连接令牌；检查后端是否启用管理接口、录制是否属于当前应用或已过期 |
| 409、等待分片、录制损坏 | 尚未完整上传可稍后重新读取；冲突或损坏的片段不会播放，需检查重复上传的内容是否保持一致 |
| 解码失败或画面样式缺失 | 检查分片校验、CSP blob worker；外部图片/字体/样式不归档，资源失效可能影响外观 |
| 找不到本地 replay 包或 style.css | 在同级 SDK 先运行 `pnpm install`、`pnpm build`，再重新安装前端依赖 |

## 验证

```bash
npm test
npm exec playwright install chromium
npm run test:e2e
npm run build
```

回放分片会在浏览器排序、逐片/整包校验后解压，缺片或内容校验失败时不构造播放器。rrweb iframe 不启用 allow-scripts，不执行录制页面脚本。首版不归档图片、字体等外部资源；资源失效可能影响外观。CSP 需允许 gzip 解码使用的 blob worker。
