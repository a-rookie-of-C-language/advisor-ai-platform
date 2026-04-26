# Advisor AI Platform

## 项目结构
- `frontend`：React + TypeScript 前端
- `backend`：Spring Boot 后端 API
- `agent`：Python RAG 索引与检索服务

## 本地依赖
- Node.js 20+
- JDK 17+
- Maven 3.9+
- Python 3.11+
- PostgreSQL 15+（需安装 pgvector 扩展）
- Ollama（默认使用 `bge-m3` 向量模型）

## 配置准备
1. 后端配置：复制并填写本地配置
```bash
cd backend/src/main/resources
copy application-local.yml.example application-local.yml
```
2. 配置数据库和 JWT：
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
3. Agent 环境变量（建议在 `agent/.env` 中配置）：
- `DATABASE_URL`（PostgreSQL DSN）

## 启动顺序（推荐）
1. 启动 PostgreSQL 并确认可连接。
2. 启动 Ollama 并拉取向量模型：
```bash
ollama pull bge-m3
```
3. 启动后端（自动执行 Flyway）：
```bash
cd backend
mvn spring-boot:run
```
4. 启动 Agent（监听 `rag_index` 通知并构建索引）：
```bash
cd agent
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
5. 启动前端：
```bash
cd frontend
npm install
npm run dev
```

## 联调验证

项目内置联调脚本： [chat_e2e_drill.mjs](file:///d:/code/advisor-ai-platform/scripts/chat_e2e_drill.mjs)

### 联调前置条件
- 后端服务已启动，默认地址 `http://localhost:8080`
- Agent 服务已启动，默认地址 `http://127.0.0.1:8001`
- Agent 已配置 `AGENT_API_TOKEN`
- 如果执行聊天主链路联调，还需要保证后端数据库、JWT、Agent 的 `OPENAI_API_KEY` 与 `OPENAI_MODEL` 已正确配置

### Agent 鉴权联调
```bash
node scripts/chat_e2e_drill.mjs auth http://localhost:8080 http://127.0.0.1:8001
```

通过标准：
- `agent /chat/stream` 在未携带 token 时返回 `401`
- 返回体包含 `{"detail":"invalid agent token"}`

### 后端 + Agent 聊天主链路联调
```bash
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

## 功能链路说明（RAG）
1. 前端上传文档到后端。
2. 后端写入 `rag_document`（`PENDING`）。
3. 数据库触发器发送 `NOTIFY rag_index`。
4. Agent 监听通知，完成分块、向量化、写入 `rag_document_chunk`。
5. 检索服务按知识库返回相关片段。

## 常见问题
- 文档上传后一直是 `PENDING`：检查 Agent 是否运行、`DATABASE_URL` 是否正确。
- 检索报向量错误：确认数据库已安装 pgvector，且 `rag_document_chunk.embedding` 维度与模型一致。
- 前端 401：检查登录态与后端 JWT 配置。

## Memory Service 服务说明（2026-04-26）

- `/api/memory/**` 已正式迁移到 `backend/memory-service`，不再由 `chat-service` 承担。
- 联调时请确保 `memory-service` 与其他微服务一起启动。
- 关键配置：
  - `MEMORY_API_TOKEN`：Agent 调用 `/api/memory/**` 的鉴权 token
  - `JWT_SECRET`：JWT 验签密钥
  - `DB_*`：PostgreSQL 连接信息
### Memory 全链路联调（真实服务）
```bash
node scripts/memory_e2e_drill.mjs http://localhost:8080 http://localhost:8081
```

通过标准：
- 返回 `{"ok": true}`
- 覆盖 `/api/memory/**` 完整接口（health、search、candidates、session-summary、task submit/pending/done/fail）
### Memory JMeter 压测（全链路）
```powershell
pwsh ./scripts/run_memory_jmeter.ps1 -Profile load -BaseUrl http://127.0.0.1:8080 -MemoryToken arookieofc
```

可选 Profile：`smoke|load|stress|spike`，结果输出到 `scripts/jmeter/results/`。
### Nacos 公共配置下发（统一JWT与内部Token）
```powershell
.\scripts\push_nacos_common_config.ps1 -NacosServer http://127.0.0.1:8848
```

公共配置模板：`backend/nacos/advisor-ai-platform-common.yaml`