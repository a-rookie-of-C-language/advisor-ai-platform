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

  private constructor() {
    this.host = process.env.AGENT_API_HOST?.trim() || "127.0.0.1";
    this.port = Number.parseInt(process.env.AGENT_API_PORT || "8001", 10);
    this.token = process.env.AGENT_API_TOKEN?.trim() || "";
    this.openAiApiKey = process.env.OPENAI_API_KEY?.trim() || "";
    this.openAiBaseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
    this.openAiModel = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
    this.openAiTemperature = Number.parseFloat(process.env.OPENAI_TEMPERATURE || "0.2");
    this.requestTimeoutMs = this.readTimeoutMs();
    this.rustCorePath = process.env.AGENT_CORE_PATH?.trim() || undefined;
    this.workspaceBasePath = process.env.AGENT_WORKSPACE_PATH?.trim() || "workspace";
    this.memoryApiBaseUrl = (process.env.MEMORY_API_BASE_URL?.trim() || "").replace(/\/+$/, "");
    this.memoryApiToken = process.env.MEMORY_API_TOKEN?.trim() || "";
    this.memoryTopK = Number.parseInt(process.env.MEMORY_TOP_K || "6", 10);
    this.ragApiBaseUrl = (process.env.RAG_API_BASE_URL?.trim() || "").replace(/\/+$/, "");
    this.ragApiToken = process.env.RAG_API_TOKEN?.trim() || "";
  }

  static fromEnv(): AgentConfig {
    return new AgentConfig();
  }

  private readTimeoutMs(): number {
    const timeoutMs = process.env.OPENAI_TIMEOUT_MS?.trim();
    if (timeoutMs) {
      return Number.parseInt(timeoutMs, 10);
    }
    const timeoutSec = process.env.OPENAI_TIMEOUT_SEC?.trim();
    if (timeoutSec) {
      return Math.round(Number.parseFloat(timeoutSec) * 1000);
    }
    return 600_000;
  }
}
