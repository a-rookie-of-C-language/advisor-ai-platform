# Advisor AI Platform

Advisor AI Platform 是面向高校辅导员业务场景的 AI 平台，提供统一登录、智能聊天、知识库 RAG、长期记忆、学生档案、签到、审计、风控、监控与反馈闭环能力。

详细架构职责边界见 [docs/architecture.md](docs/architecture.md)。

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `frontend` | React + TypeScript + Vite + Ant Design 前端应用 |
| `backend` | Java Spring Boot / Spring Cloud Alibaba 微服务集合 |
| `backend/gateway` | 统一业务 API 网关，负责路由、JWT 协同、风控前置与入口治理 |
| `backend/common-core` | 后端公共能力，包括安全、异常、重试、内部 token 等 |
| `backend/auth-service` | 认证与身份服务 |
| `backend/chat-service` | 聊天会话、消息持久化、Agent 调用与审计协作 |
| `backend/rag-service` | 知识库与文档元数据服务 |
| `backend/memory-service` | 长期记忆、会话摘要与记忆任务服务 |
| `backend/audit-service` | 审计日志写入、查询和统计服务 |
| `backend/risk-control-service` | 输入/输出风控、行为埋点和风险治理服务 |
| `backend/student-service` | 学生档案、导入、任务与统计服务 |
| `backend/teacher-service` | 教师、课程和授课关系服务 |
| `backend/check-in-service` | 签到活动、签到记录和异常处理服务 |
| `backend/feedback-service` | 用户反馈、Issue 与 GitHub 同步服务 |
| `backend/ai-gateway` | Rust 模型供应商网关，负责 provider 抽象、模型路由、限流和调用治理 |
| `agent-ts` | TypeScript Agent 控制层，负责 HTTP/SSE 接入、上下文构建、工具编排和运行时胶水 |
| `agent-core` | Rust Agent 执行核心，负责 OpenAI-compatible 流式请求、SSE 解析、工具调用协议和执行状态机 |
| `scripts` | 本地启动、联调、压测和配置下发脚本 |
| `docs` | 架构、需求和代码优化记录等项目文档 |

## 本地依赖

- Node.js 20+
- JDK 17+
- Maven 3.9+
- Rust 1.80+
- Python 3.11+（用于本地脚本、Podman Compose 等辅助工具）
- PostgreSQL 15+（需要安装 `pgvector` 扩展）
- Redis、Kafka、Nacos、Jaeger、Prometheus/Grafana（本地容器化联调推荐）
- Ollama（默认使用 `bge-m3` 向量模型）
- Podman / podman-compose（使用项目脚本启动基础设施时需要）

## 环境准备

### Python 虚拟环境

优先使用项目内已有 `.venv`。如需重新创建：

```powershell
d:\python\python.exe -m venv .venv
.\.venv\Scripts\activate
```

如需使用 `podman-compose`：

```powershell
agent\.venv\Scripts\python.exe -m pip install podman-compose
```

### 基础环境变量

后端和联调脚本依赖以下变量，建议在 PowerShell 会话中统一设置：

```powershell
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="<db-password>"
$env:JWT_SECRET="<jwt-secret>"
$env:ADVISOR_JWT_SECRET=$env:JWT_SECRET
$env:INTERNAL_SERVICE_TOKEN="<internal-service-token>"
$env:MEMORY_API_TOKEN="<memory-api-token>"
$env:AGENT_API_TOKEN="<agent-api-token>"
```

Agent 与模型调用相关变量：

```powershell
$env:OPENAI_API_KEY="<openai-api-key>"
$env:OPENAI_BASE_URL="<openai-compatible-base-url>"
$env:OPENAI_MODEL="<model-name>"
$env:OPENAI_TIMEOUT_SEC="120"
$env:AGENT_RUST_CORE_ENABLED="true"
$env:AGENT_CORE_PATH="<optional-agent-core-exe-path>"
$env:MEMORY_API_BASE_URL="http://127.0.0.1:8080"
```

## 启动顺序

### 1. 启动基础设施

推荐使用脚本启动 Nacos、PostgreSQL 和 Jaeger：

```powershell
.\scripts\start_infra.ps1
```

如需手动启动，请确保 PostgreSQL 可连接、Nacos 可访问，并已安装 `pgvector` 扩展。

### 2. 准备向量模型

```powershell
ollama pull bge-m3
```

### 3. 下发公共配置

```powershell
.\scripts\push_nacos_common_config.ps1 -NacosServer http://127.0.0.1:8848
```

公共配置模板位于：

```text
backend/nacos/advisor-ai-platform-common.yaml
```

### 4. 启动后端微服务

本地最小聊天链路可启动 `auth-service`、`chat-service`、`memory-service` 和 `gateway`：

```powershell
.\scripts\start_backend_for_pressure.ps1
```

也可以按模块单独启动：

```powershell
cd backend\auth-service
mvn spring-boot:run

cd ..\chat-service
mvn spring-boot:run

cd ..\memory-service
mvn spring-boot:run

cd ..\gateway
mvn spring-boot:run
```

需要完整业务链路时，再按需启动 `rag-service`、`audit-service`、`risk-control-service`、`student-service`、`teacher-service`、`check-in-service`、`feedback-service` 和 `ai-gateway`。

### 5. 启动 Agent

默认使用 TypeScript 控制层 + Rust 执行核心：

```powershell
cd agent-core
cargo build

cd ..\agent-ts
npm install
npm run build
npm start
```

也可以使用脚本启动：

```powershell
.\scripts\start-local-agent-daemon.ps1 -Runtime ts
```

### 6. 启动前端

```powershell
cd frontend
npm install
npm run dev
```

## 端口约定

| 模块 | 默认端口 |
| --- | --- |
| `gateway` | 8080 |
| `auth-service` | 8081 |
| `chat-service` | 8082 |
| `rag-service` | 8083 |
| `memory-service` | 8084 |
| `audit-service` | 8085 |
| `risk-control-service` | 8086 |
| `check-in-service` | 8087 |
| `teacher-service` | 8089 |
| `student-service` | 8091 |
| `agent-ts` | 8001 |
| `ai-gateway` | 8090 |

前端默认通过 `gateway` 的 `/api/**` 访问业务服务。

## 联调验证

项目内置联调脚本：[scripts/chat_e2e_drill.mjs](scripts/chat_e2e_drill.mjs) 和 [scripts/memory_e2e_drill.mjs](scripts/memory_e2e_drill.mjs)。

### Agent 鉴权联调

```powershell
node scripts/chat_e2e_drill.mjs auth http://localhost:8080 http://127.0.0.1:8001
```

通过标准：

- Agent `/chat/stream` 未携带 token 时返回 `401` 或 `403`
- 返回体包含无效 token 的错误信息

### 后端 + Agent 聊天主链路联调

```powershell
node scripts/chat_e2e_drill.mjs smoke http://localhost:8080 http://127.0.0.1:8001
```

脚本会自动执行：

1. 注册并登录测试用户
2. 创建会话
3. 发送非流式消息
4. 发送流式消息并等待 `done`
5. 查询消息列表并校验持久化结果

通过标准：

- `streamHasDone=true`
- `streamHasDelta=true`
- `streamHasError=false`
- `messageCount >= 2`
- `sessionKbId=0`

### Memory 全链路联调

```powershell
node scripts/memory_e2e_drill.mjs http://localhost:8080 http://localhost:8081
```

参数说明：

- 第一个地址是业务入口地址，通常为 `gateway`：`http://localhost:8080`
- 第二个地址是认证服务地址，通常为 `auth-service`：`http://localhost:8081`
- `MEMORY_API_TOKEN` 需要通过环境变量或第三个参数提供

通过标准：

- 返回 `{"ok": true}`
- 覆盖 `/api/memory/**` 的 health、search、candidates、session-summary、task submit/pending/done/fail 链路

### Memory JMeter 压测

```powershell
$env:MEMORY_API_TOKEN="<memory-token>"
pwsh ./scripts/run_memory_jmeter.ps1 -Profile load -BaseUrl http://127.0.0.1:8080
```

可选 Profile：

```text
smoke | load | stress | spike
```

结果输出到 `scripts/jmeter/results/`。

## 质量检查

后端格式检查：

```powershell
cd backend
mvn -q -DskipTests spotless:check
```

后端编译示例：

```powershell
cd backend
mvn -q -pl gateway -am -DskipTests compile
```

Agent 检查：

```powershell
cd agent-core
cargo fmt --all -- --check
cargo test
cargo build

cd ..\agent-ts
npm run check
npm run test:integration
```

前端检查：

```powershell
cd frontend
npm run lint
npm run test
npm run build
```

## 核心链路

### 聊天链路

```text
frontend -> gateway -> chat-service -> agent-ts / agent-core -> LLM/RAG/Memory/Tools -> chat-service -> frontend
```

### RAG 链路

```text
frontend -> gateway -> rag-service -> agent-ts / agent-core -> 向量化/检索 -> chat-service -> frontend
```

### 风控链路

```text
frontend -> gateway -> risk-control-service -> 目标业务服务
```

### Memory 链路

```text
agent-ts -> gateway -> memory-service -> PostgreSQL/pgvector
```

## 常见问题

- 文档上传后一直是 `PENDING`：检查 Agent 是否运行、数据库连接是否正确、`rag-service` 文档状态是否正常。
- 检索报向量错误：确认 PostgreSQL 已安装 `pgvector`，且向量维度与当前 embedding 模型一致。
- 前端 401：检查登录态、`JWT_SECRET` / `ADVISOR_JWT_SECRET` 和 gateway 鉴权配置。
- Memory 接口 401/403：检查 `MEMORY_API_TOKEN` 与请求头 `X-Memory-Token`。
- Agent 无响应：检查 `AGENT_API_TOKEN`、模型环境变量、`agent-core` 构建产物和 `AGENT_RUST_CORE_ENABLED`。
- 服务端口冲突：以 README 端口表和 `docs/architecture.md` 为准，确认本地没有旧进程占用端口。
