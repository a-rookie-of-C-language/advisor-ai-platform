import type { AgentConfig } from "./AgentConfig.js";
import type { JsonObject } from "./JsonTypes.js";
import type { RagDocument } from "./RagDocument.js";

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export class RagApiClient {
  constructor(private readonly config: AgentConfig) {}

  async listDocuments(kbId: number): Promise<RagDocument[]> {
    const response = await fetch(`${this.config.ragApiBaseUrl}/internal/rag/knowledge-bases/${kbId}/documents`, {
      headers: {
        ...(this.config.ragApiToken ? { "X-Internal-Token": this.config.ragApiToken } : {})
      }
    });
    if (!response.ok) {
      throw new Error(`rag api failed: HTTP ${response.status}`);
    }
    const payload = (await response.json()) as ApiResponse<RagDocument[]> | JsonObject;
    if ("code" in payload && payload.code !== 200) {
      throw new Error(`rag api failed: ${payload.message}`);
    }
    const data = "data" in payload ? payload.data : payload;
    return Array.isArray(data) ? (data as RagDocument[]) : [];
  }
}
