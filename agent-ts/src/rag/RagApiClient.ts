import type { AgentConfig } from "../config/model/AgentConfig.js";
import { RagApiHttpClient } from "./RagApiHttpClient.js";
import type { RagDocument } from "./RagDocument.js";

export class RagApiClient {
  private readonly httpClient: RagApiHttpClient;

  constructor(config: AgentConfig) {
    this.httpClient = new RagApiHttpClient(config);
  }

  async listDocuments(kbId: number): Promise<RagDocument[]> {
    const data = await this.httpClient.request<RagDocument[]>(`/internal/rag/knowledge-bases/${kbId}/documents`);
    return Array.isArray(data) ? (data as RagDocument[]) : [];
  }
}
