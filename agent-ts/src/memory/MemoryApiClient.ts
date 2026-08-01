import type { AgentConfig } from "../config/AgentConfig.js";
import { MemoryApiEndpointFactory } from "./MemoryApiEndpointFactory.js";
import { MemoryApiHttpClient } from "./MemoryApiHttpClient.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { MemoryItem } from "./MemoryItem.js";
import type { SessionSummary } from "../common/SessionSummary.js";

export class MemoryApiClient {
  private readonly endpointFactory = new MemoryApiEndpointFactory();
  private readonly httpClient: MemoryApiHttpClient;

  constructor(config: AgentConfig) {
    this.httpClient = new MemoryApiHttpClient(config);
  }

  async searchLongTerm(userId: number, kbId: number, query: string, topK: number): Promise<MemoryItem[]> {
    const response = await this.httpClient.request<MemoryItem[]>(this.endpointFactory.longTermSearch(), {
      method: "POST",
      body: JSON.stringify({
        userId,
        kbId,
        query,
        topK,
        mode: "hybrid"
      })
    });
    return Array.isArray(response) ? response : [];
  }

  async getCoreMemories(userId: number, kbId: number): Promise<MemoryItem[]> {
    const response = await this.httpClient.request<MemoryItem[]>(this.endpointFactory.coreMemories(userId, kbId));
    return Array.isArray(response) ? response : [];
  }

  async getSessionSummary(sessionId: number): Promise<SessionSummary | null> {
    return this.httpClient.request<SessionSummary | null>(this.endpointFactory.sessionSummary(sessionId));
  }

  async upsertCandidates(params: {
    userId: number;
    kbId: number;
    candidates: {
      content: string;
      confidence?: number;
      sourceTurnId?: string | null;
      tags?: JsonObject | null;
      memoryType?: string | null;
      isCore?: boolean | null;
    }[];
  }): Promise<JsonObject> {
    return this.httpClient.request<JsonObject>(this.endpointFactory.longTermCandidates(), {
      method: "POST",
      body: JSON.stringify(params)
    });
  }

  async submitMemoryTask(params: {
    userId: number;
    kbId: number;
    sessionId: number;
    turnId: string;
    userText: string;
    assistantText: string;
    recentMessages: { role: string; content: string }[];
  }): Promise<JsonObject> {
    return this.httpClient.request<JsonObject>(this.endpointFactory.memoryTaskSubmit(), {
      method: "POST",
      body: JSON.stringify(params)
    });
  }
}
