import { AgentEnvReader } from "./AgentEnvReader.js";

export class AgentConfig {
  readonly host: string;
  readonly port: number;
  readonly token: string;
  readonly openAiApiKey: string;
  readonly openAiBaseUrl: string;
  readonly openAiModel: string;
  readonly openAiTemperature: number;
  readonly requestTimeoutMs: number;
  readonly rustCorePath: string | undefined;
  readonly workspaceBasePath: string;
  readonly memoryApiBaseUrl: string;
  readonly memoryApiToken: string;
  readonly memoryTopK: number;
  readonly ragApiBaseUrl: string;
  readonly ragApiToken: string;
  readonly webFetchEnabled: boolean;
  readonly webFetchMaxContentLength: number;
  readonly webSearchEnabled: boolean;
  readonly webSearchApiKey: string;
  readonly webSearchUrl: string;
  readonly webSearchMaxResults: number;
  readonly mcpToolsEnabled: boolean;
  readonly mcpServers: string;

  private constructor() {
    const envReader = new AgentEnvReader();
    this.host = envReader.readString("AGENT_API_HOST", "127.0.0.1");
    this.port = envReader.readInt("AGENT_API_PORT", 8001);
    this.token = envReader.readString("AGENT_API_TOKEN", "");
    this.openAiApiKey = envReader.readString("OPENAI_API_KEY", "");
    this.openAiBaseUrl = envReader.readTrimmedUrl("OPENAI_BASE_URL", "https://api.openai.com/v1");
    this.openAiModel = envReader.readString("OPENAI_MODEL", "gpt-4.1-mini");
    this.openAiTemperature = envReader.readFloat("OPENAI_TEMPERATURE", 0.2);
    this.requestTimeoutMs = envReader.readOpenAiTimeoutMs();
    this.rustCorePath = envReader.readOptionalString("AGENT_CORE_PATH");
    this.workspaceBasePath = envReader.readString("AGENT_WORKSPACE_PATH", "workspace");
    this.memoryApiBaseUrl = envReader.readTrimmedUrl("MEMORY_API_BASE_URL", "");
    this.memoryApiToken = envReader.readString("MEMORY_API_TOKEN", "");
    this.memoryTopK = envReader.readInt("MEMORY_TOP_K", 6);
    this.ragApiBaseUrl = envReader.readTrimmedUrl("RAG_API_BASE_URL", "");
    this.ragApiToken = envReader.readString("RAG_API_TOKEN", "");
    this.webFetchEnabled = envReader.readBool("WEB_FETCH_ENABLED", true);
    this.webFetchMaxContentLength = envReader.readInt("WEB_FETCH_MAX_CONTENT_LENGTH", 2000);
    this.webSearchEnabled = envReader.readBool("WEB_SEARCH_ENABLED", true);
    this.webSearchApiKey = envReader.readString("TAVILY_API_KEY", "");
    this.webSearchUrl = envReader.readString("TAVILY_SEARCH_URL", "https://api.tavily.com/search");
    this.webSearchMaxResults = envReader.readInt("WEB_SEARCH_MAX_RESULTS", 5);
    this.mcpToolsEnabled = envReader.readBool("MCP_TOOLS", false);
    this.mcpServers = envReader.readString("MCP_SERVERS", "");
  }

  static fromEnv(): AgentConfig {
    return new AgentConfig();
  }
}
