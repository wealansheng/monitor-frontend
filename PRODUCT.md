# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vue 3 + TypeScript + ECharts（用户指定）。

## Users

研发运维人员和产品运营人员。两类用户需要在同一个监控工作台中切换视角。

## Product Purpose

把 `weils-monitor` SDK 上报到 `monitor-backend` 的前端性能、错误、行为事件与错误录制转为可查询的监控工作台，帮助用户发现异常、理解变化、定位源码并还原错误前后的操作。

## Operating Context

SDK 将 performance、request、resource、error、stability、behavior 事件写入 ClickHouse 三张明细表；开启 Replay 后，错误触发的 gzip/base64 分片独立写入第四张 `event_record`。管理端读取聚合、事件明细、源码定位与录制查询接口，按应用隔离。

## Capabilities and Constraints

- 前端使用 Vue 3、TypeScript、ECharts。
- 支持研发运维与产品运营视角切换。
- 可以为现有 `monitor-backend` 增加聚合查询接口。
- 当前接收服务没有用户身份体系；管理查询需要独立访问令牌。
- 无数据和接口失败时，不把示例值呈现为真实数据。
- 提供总览、错误、性能、行为、事件、操作回放六个主页面及事件/录制详情。
- 错误详情可按调用帧查看私有 Source Map 内嵌源码，并按错误 UUID 打开关联录制。
- 工作台不录制自身操作；播放器懒加载，初始暂停，支持进度、错误定位、倍速、适应窗口与放大检查。
- 录制必须完整且校验成功才播放；缺片、损坏、过期及无关联数据有明确状态。
- 查询令牌仅保存在当前标签页会话；部署需要同源 API 代理、访问控制和 History 回退。
- 当前本地播放依赖同级 SDK 的构建产物，独立发布前需固定包版本或保留同级构建流程。

## Evidence on Hand

- `../weils-monitor`：SDK 实现和事件协议。
- `../monitor-backend`：接收服务、ClickHouse 表结构和 Source Map 定位接口。
- `src/data/replayDemo.ts`：用于演示和测试的合成 DOM 录制，明确标记为演示内容。
- 尚无真实业务监控样本、商标或品牌资源。

## Product Principles

- 先让用户看清趋势和异常，再进入事件明细。
- 同一数据源按角色组织，避免指标含义分叉。
- 展示查询范围和数据状态，区分真实结果与演示内容。
- 通过同一错误的应用标识与 UUID 连接事件、源码与操作现场，不把录制片数混入事件统计。
