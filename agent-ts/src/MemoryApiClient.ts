import type { AgentConfig } from "./AgentConfig.js";
import { MemoryApiHttpClient } from "./MemoryApiHttpClient.js";
import type { JsonObject } from "./JsonTypes.js";
import type { MemoryItem } from "./MemoryItem.js";
import type { SessionSummary } from "./SessionSummary.js";

export class MemoryApiClient {
  private readonly httpClient: MemoryApiHttpClient;

  constructor(config: AgentConfig) {
    this.httpClient = new MemoryApiHttpClient(config);
  }

  async searchLongTerm(userId: number, kbId: number, query: string, topK: number): Promise<MemoryItem[]> {
    const response = await this.httpClient.request<MemoryItem[]>("/api/memory/long-term/search", {
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
    const params = new URLSearchParams({ userId: String(userId), kbId: String(kbId) });
    const response = await this.httpClient.request<MemoryItem[]>(`/api/memory/long-term/core?${params}`);
    return Array.isArray(response) ? response : [];
  }

  async getSessionSummary(sessionId: number): Promise<SessionSummary | null> {
    return this.httpClient.request<SessionSummary | null>(`/api/memory/session-summary/${sessionId}`);
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
    return this.httpClient.request<JsonObject>("/api/memory/long-term/candidates", {
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
    return this.httpClient.request<JsonObject>("/api/memory/task/submit", {
      method: "POST",
      body: JSON.stringify(params)
    });
  }
}
