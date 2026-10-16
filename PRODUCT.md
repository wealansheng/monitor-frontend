# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vue 3 + TypeScript + ECharts（用户指定）。

## Users

研发运维人员和产品运营人员。两类用户需要在同一个监控工作台中切换视角。

## Product Purpose

把 `weils-monitor` SDK 上报到 `monitor-backend` 的前端性能、错误和行为事件转为可查询的监控大屏，帮助用户发现异常、理解变化并定位问题。

## Operating Context

SDK 将 performance、request、resource、error、stability、behavior 事件写入 ClickHouse 三张明细表。管理端读取聚合查询接口，按应用和时间范围分析。

## Capabilities and Constraints

- 前端使用 Vue 3、TypeScript、ECharts。
- 支持研发运维与产品运营视角切换。
- 可以为现有 `monitor-backend` 增加聚合查询接口。
- 当前接收服务没有用户身份体系；管理查询需要独立访问令牌。
- 无数据和接口失败时，不把示例值呈现为真实数据。

## Evidence on Hand

- `../weils-monitor`：SDK 实现和事件协议。
- `../monitor-backend`：接收服务、ClickHouse 表结构和 Source Map 定位接口。
- 尚无真实业务监控样本、商标或品牌资源。

## Product Principles

- 先让用户看清趋势和异常，再进入事件明细。
- 同一数据源按角色组织，避免指标含义分叉。
- 展示查询范围和数据状态，区分真实结果与演示内容。
