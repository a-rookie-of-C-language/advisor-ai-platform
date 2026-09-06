# 架构职责边界

本文档用于说明 Advisor AI Platform 中各模块的职责边界，避免业务服务、AI 编排服务、模型网关和治理能力之间职责混淆。

## 总体分层

- `frontend`：用户交互入口，负责登录、聊天、知识库、学生管理、签到、审计与监控页面。
- `backend/gateway`：统一业务 API 入口，负责路由转发、JWT 认证协同、输入风控前置和跨服务入口治理。
- Java 业务微服务：负责各业务域的数据、流程、鉴权与审计协作。
- `agent-ts`：AI 控制层，负责聊天 HTTP/SSE 接入、模型编排、工具编排入口和运行时胶水。
- `agent-core`：Rust 执行核心，负责 OpenAI-compatible 流式请求、SSE 分片解析、工具调用协议和执行状态机。
- `backend/ai-gateway`：模型供应商网关，负责面向模型服务的 provider 抽象、模型路由、限流和调用治理。
- 基础设施：PostgreSQL/pgvector、Redis、Kafka、Nacos、Jaeger、Prometheus、Grafana 等提供存储、注册配置、消息、追踪和监控能力。

## 模块职责

### frontend

前端使用 React、TypeScript、Vite 和 Ant Design 构建。它只面向统一的 `/api` 入口发起请求，不直接感知具体后端微服务地址。

主要职责：

- 登录、鉴权态管理和路由保护。
- 聊天、RAG、学生、签到、审计、监控等业务页面。
- 通过 tracker 上报用户行为事件到 `/api/tracking/**`。

### gateway

`gateway` 是业务 API 的统一入口。它不承载具体业务逻辑，也不直接操作数据库。

主要职责：

- 将 `/api/auth/**`、`/api/chat/**`、`/api/rag/**`、`/api/memory/**`、`/api/audit/**`、`/api/student/**`、`/api/check-in/**`、`/api/tracking/**` 路由到对应服务。
- 在进入高风险接口前调用 `risk-control-service` 做输入风控。
- 协同 JWT 鉴权、内部 token、trace 和指标暴露。

### auth-service

认证与身份服务。

主要职责：

- 用户注册、登录、刷新 token、登出。
- 用户身份内部查询。
- 维护用户身份与刷新 token 数据。

### chat-service

聊天业务服务，是用户会话和消息持久化的核心服务。

主要职责：

- 会话创建、删除、知识库绑定和消息查询。
- 非流式与流式聊天接口。
- 调用 `agent-ts` 获取 AI 回复。
- 保存用户和助手消息、来源引用、turnId 和 traceId。
- 通过审计注解触发聊天相关审计。

### agent-ts / agent-core

TypeScript + Rust AI 编排服务，不作为普通业务数据服务使用。`agent-ts` 负责 HTTP/SSE、上下文构建、工具执行和外部系统胶水，`agent-core` 负责可独立演进的高性能模型流式执行核心。两者通过 stdin/stdout JSONL 通信。

主要职责：

- 调用 LLM provider 生成回复。
- 通过 `memory-service` API 读取会话摘要、核心记忆和长期记忆，并在回答后提交记忆任务。
- 通过 workspace 管理能力提供会话级文件统计和缓存清理。
- 编排 RAG 检索、工具调用、MCP 工具和安全过滤；这些能力在 TS/Rust 迁移中逐步替换旧 Python 实现。
- 提供 `/chat/stream` 给 `chat-service` 调用。
- `agent-core` 执行 OpenAI-compatible 流式请求，输出 delta、tool_call 和 done JSONL 事件。
- `agent-ts` 执行 memory、RAG、web 和 MCP 上下文编排；工具调用由 TS 执行后回传第二轮 Rust 请求。
- Rust 核心不可用或在产生输出前失败时，TS 自动回退到原有 OpenAI 客户端。
- SSE 客户端断开会沿 AbortSignal 终止 Rust 子进程，避免后台请求泄漏。

### ai-gateway

Rust 实现的模型供应商网关，职责不同于业务网关 `gateway`。

主要职责：

- 面向 OpenAI 兼容或其他模型供应商的统一调用抽象。
- 模型路由、租户/路由/模型级限流。
- 模型调用审计、token 用量记录和 provider 治理。
- 为后端或 agent 提供可治理的模型访问入口。

### rag-service

知识库与文档元数据服务。

主要职责：

- 知识库增删查。
- 文档上传、删除和状态维护。
- 对内部服务提供知识库存在性校验。
- 不直接承担大模型推理；文档切分、向量化和检索编排由 agent 侧能力配合完成。

### memory-service

记忆服务负责长期记忆、会话摘要和记忆任务管理。

主要职责：

- 长期记忆检索和候选写入。
- 会话摘要读取与保存。
- 记忆任务提交、拉取、完成和失败标记。
- 管理记忆向量化存储与检索策略。

### risk-control-service

风控服务负责内容安全、行为风险和埋点处理。

主要职责：

- 为 `gateway` 提供内部输入风控检查。
- 处理 `/api/tracking/**` 上报的用户行为事件。
- 基于规则、黑名单、限流、提示注入和内容安全策略做风险判定。
- 使用 Kafka、Redis 和数据库支撑行为统计与风控记录。

### audit-service

审计服务负责平台审计日志的写入入口和查询统计。

主要职责：

- 提供内部审计日志写入接口。
- 提供审计日志查询、详情和模块统计接口。
- 不承载业务行为本身，只记录和展示审计事实。

### student-service

学生业务域服务。

主要职责：

- 学生档案、分页查询、详情、创建、更新和删除。
- 学生数据导入、批次和重复数据查询。
- 学生任务管理。
- 聚合签到服务提供学生签到摘要和明细。

### teacher-service

教师与授课关系服务。

主要职责：

- 维护课程、教师档案和授课关系。
- 为签到等服务提供教师是否可授课、教学班级等内部查询。

### check-in-service

签到业务域服务。

主要职责：

- 教师创建签到活动。
- 学生签到。
- 签到记录查询。
- 通过内部服务调用校验学生、教师和身份信息。

## 关键调用链路

### 聊天链路

`frontend` -> `gateway` -> `chat-service` -> `agent-ts` / `agent-core` -> LLM/RAG/Memory/Tools -> `chat-service` 持久化消息 -> `frontend`

### RAG 链路

`frontend` -> `gateway` -> `rag-service` 保存知识库和文档元数据 -> `agent-ts` / `agent-core` 索引文档 -> 聊天时由 `agent-ts` 检索并组装上下文。

### 风控链路

`frontend` -> `gateway` -> `risk-control-service` 内部风控检查 -> 通过后继续转发到目标业务服务。

### 埋点链路

`frontend tracker` -> `gateway` `/api/tracking/**` -> `risk-control-service` -> Kafka/数据库。

## 端口约定

| 模块 | 默认端口 |
| --- | --- |
| gateway | 8080 |
| auth-service | 8081 |
| chat-service | 8082 |
| rag-service | 8083 |
| memory-service | 8084 |
| audit-service | 8085 |
| risk-control-service | 8086 |
| check-in-service | 8087 |
| teacher-service | 8089 |
| student-service | 8091 |
| agent-ts | 8001 |
| ai-gateway | 8090 |

本地直接启动多个服务时，应以本表为准，避免服务端口冲突。
