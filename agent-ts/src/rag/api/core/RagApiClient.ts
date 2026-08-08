import type { AgentConfig } from "../../../config/model/AgentConfig.js";
import type { RagDocument } from "../../context/model/RagDocument.js";
import { RagApiHttpClient } from "../http/RagApiHttpClient.js";

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
