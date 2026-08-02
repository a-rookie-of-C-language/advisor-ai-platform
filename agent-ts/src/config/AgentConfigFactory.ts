import type { AgentConfigValues } from "./model/AgentConfigValues.js";
import { AgentEnvReader } from "./env/AgentEnvReader.js";

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
      openAiTemperature: this.envReader.readFloat("OPENAI_TEMPERATURE", 0.2),
      requestTimeoutMs: this.envReader.readOpenAiTimeoutMs(),
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
      mcpServers: this.envReader.readString("MCP_SERVERS", "")
    };
  }
}
