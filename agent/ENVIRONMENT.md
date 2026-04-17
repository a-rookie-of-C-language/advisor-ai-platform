# Agent Environment Variables

This file documents the key runtime variables for `agent`.

## API Basics

- `AGENT_MODE`: `all` | `api` | `indexer`
- `AGENT_API_HOST`: API bind host
- `AGENT_API_PORT`: API bind port
- `AGENT_API_TOKEN`: optional direct-access token for `/chat/stream`
  - If configured, request must include:
    - `Authorization: Bearer <token>`, or
    - `X-Agent-Token: <token>`

## LLM

- `OPENAI_API_KEY`: required for chat
- `OPENAI_BASE_URL`: OpenAI-compatible base URL
- `OPENAI_MODEL`: model id
- `OPENAI_TEMPERATURE`: generation temperature
- `OPENAI_TIMEOUT_SEC`: request timeout

## Tool Controls

- `ENABLE_TOOL_USE`: global switch for tool calling in stream chat
  - `true` to allow model tool calls
  - `false` to force plain chat only
- `ENABLED_TOOLS`: comma-separated whitelist
  - Empty value means all registered tools are available
  - Recommended production value: `rag_search`

## Memory

- `MEMORY_API_BASE_URL`: Java backend memory API base URL
- `MEMORY_API_TOKEN`: required when memory API is enabled
- `MEMORY_API_TIMEOUT_SEC`
- `MEMORY_API_MAX_RETRIES`
- `MEMORY_API_RETRY_BACKOFF_SEC`

## RAG / Indexer

- `DATABASE_URL`: PostgreSQL DSN
- `OLLAMA_BASE_URL`: embedding/OCR runtime endpoint
- `EMBEDDING_MODEL`: embedding model name
- `DB_POOL_MINCONN`
- `DB_POOL_MAXCONN`
- `DB_STATEMENT_TIMEOUT_SEC`
- `INDEX_DB_MAX_RETRIES`
- `INDEX_DB_RETRY_BACKOFF_SEC`

## Recommended Production Defaults

- `AGENT_API_TOKEN`: set non-empty strong token
- `ENABLE_TOOL_USE=true`
- `ENABLED_TOOLS=rag_search`
- `DEBUG_STREAM=false`
