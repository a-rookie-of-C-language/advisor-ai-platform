import type { AgentConfig } from "./AgentConfig.js";
import type { JsonObject } from "./JsonTypes.js";
import type { MemoryItem } from "./MemoryItem.js";
import type { SessionSummary } from "./SessionSummary.js";

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export class MemoryApiClient {
  constructor(private readonly config: AgentConfig) {}

  async searchLongTerm(userId: number, kbId: number, query: string, topK: number): Promise<MemoryItem[]> {
    const response = await this.request<MemoryItem[]>("/api/memory/long-term/search", {
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
    const response = await this.request<MemoryItem[]>(`/api/memory/long-term/core?${params}`);
    return Array.isArray(response) ? response : [];
  }

  async getSessionSummary(sessionId: number): Promise<SessionSummary | null> {
    return this.request<SessionSummary | null>(`/api/memory/session-summary/${sessionId}`);
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
    return this.request<JsonObject>("/api/memory/long-term/candidates", {
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
    return this.request<JsonObject>("/api/memory/task/submit", {
      method: "POST",
      body: JSON.stringify(params)
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.config.memoryApiBaseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.config.memoryApiToken ? { Authorization: `Bearer ${this.config.memoryApiToken}` } : {}),
        ...(init.headers || {})
      }
    });
    if (!response.ok) {
      throw new Error(`memory api failed: HTTP ${response.status}`);
    }
    const payload = (await response.json()) as ApiResponse<T> | JsonObject;
    if ("code" in payload && payload.code !== 200) {
      throw new Error(`memory api failed: ${payload.message}`);
    }
    return ("data" in payload ? payload.data : payload) as T;
  }
}
