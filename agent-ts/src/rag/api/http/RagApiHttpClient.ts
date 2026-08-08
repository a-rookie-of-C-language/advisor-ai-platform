import type { JsonObject } from "../../../common/json/types/JsonTypes.js";
import type { AgentConfig } from "../../../config/model/AgentConfig.js";

interface RagApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export class RagApiHttpClient {
  constructor(private readonly config: AgentConfig) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.config.ragApiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...(this.config.ragApiToken ? { "X-Internal-Token": this.config.ragApiToken } : {}),
        ...(init.headers || {})
      }
    });
    if (!response.ok) {
      throw new Error(`rag api failed: HTTP ${response.status}`);
    }
    const payload = (await response.json()) as RagApiResponse<T> | JsonObject;
    if ("code" in payload && payload.code !== 200) {
      throw new Error(`rag api failed: ${payload.message}`);
    }
    return ("data" in payload ? payload.data : payload) as T;
  }
}
