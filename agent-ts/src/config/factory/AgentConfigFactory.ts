import { AgentEnvReader } from "../env/core/AgentEnvReader.js";
import type { AgentConfigValues } from "../model/values/AgentConfigValues.js";

export class AgentConfigFactory {
  constructor(private readonly envReader = new AgentEnvReader()) {}

  fromEnv(): AgentConfigValues {
    return {
      host: this.envReader.readString("AGENT_API_HOST", "127.0.0.1"),
      port: this.envReader.readInt("AGENT_API_PORT", 8001),
      token: this.envReader.readString("AGENT_API_TOKEN", ""),
      openAiApiKey: this.envReader.readString("OPENAI_API_KEY", ""),
      openAiBaseUrl: this.envReader.readTrimmedUrl("OPENAI_BASE_URL", "https://api.openai.com/v1"),
      openAiModel: this.envReader.readString("OPENAI_MODEL", "gpt-4.1-mini"),
      openAiModels: this.envReader
        .readString("OPENAI_MODELS", "gpt-4.1-mini,gpt-4o,gpt-4.1,o4-mini")
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean),
      openAiTemperature: this.envReader.readFloat("OPENAI_TEMPERATURE", 0.2),
      openAiStructuredOutputMode: this.readStructuredOutputMode(),
      debugStream: this.envReader.readBool("DEBUG_STREAM", false),
      requestTimeoutMs: this.envReader.readOpenAiTimeoutMs(),
      rustCoreEnabled: this.envReader.readBool("AGENT_RUST_CORE_ENABLED", true),
      rustCorePath: this.envReader.readOptionalString("AGENT_CORE_PATH"),
      workspaceBasePath: this.envReader.readString("AGENT_WORKSPACE_PATH", "workspace"),
      memoryApiBaseUrl: this.envReader.readTrimmedUrl("MEMORY_API_BASE_URL", ""),
      memoryApiToken: this.envReader.readString("MEMORY_API_TOKEN", ""),
      memoryTopK: this.envReader.readInt("MEMORY_TOP_K", 6),
      ragApiBaseUrl: this.envReader.readTrimmedUrl("RAG_API_BASE_URL", ""),
      ragApiToken: this.envReader.readString("RAG_API_TOKEN", ""),
      webFetchEnabled: this.envReader.readBool("WEB_FETCH_ENABLED", true),
      webFetchMaxContentLength: this.envReader.readInt("WEB_FETCH_MAX_CONTENT_LENGTH", 2000),
      webSearchEnabled: this.envReader.readBool("WEB_SEARCH_ENABLED", true),
      webSearchApiKey: this.envReader.readString("TAVILY_API_KEY", ""),
      webSearchUrl: this.envReader.readString("TAVILY_SEARCH_URL", "https://api.tavily.com/search"),
      webSearchMaxResults: this.envReader.readInt("WEB_SEARCH_MAX_RESULTS", 5),
      mcpToolsEnabled: this.envReader.readBool("MCP_TOOLS", false),
      mcpServers: this.envReader.readString("MCP_SERVERS", ""),
      contextWindowTokens: this.envReader.readInt("AGENT_CONTEXT_WINDOW_TOKENS", 12000),
      contextReserveTokens: this.envReader.readInt("AGENT_CONTEXT_RESERVE_TOKENS", 2000),
      contextKeepLastMessages: this.envReader.readInt("AGENT_CONTEXT_KEEP_LAST_MESSAGES", 12),
      failureMemoryPath: this.envReader.readString("AGENT_FAILURE_MEMORY_PATH", ".agent-data/failure-memory.jsonl"),
      failureMemoryScoreThreshold: this.envReader.readInt("AGENT_FAILURE_MEMORY_SCORE_THRESHOLD", 70)
    };
  }

  private readStructuredOutputMode(): "disabled" | "json_object" | "json_schema" | "auto" {
    const raw = String(this.envReader.readString("OPENAI_STRUCTURED_OUTPUT_MODE", "auto")).trim().toLowerCase();
    if (raw === "disabled" || raw === "json_object" || raw === "json_schema" || raw === "auto") {
      return raw;
    }
    return "auto";
  }
}
