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
