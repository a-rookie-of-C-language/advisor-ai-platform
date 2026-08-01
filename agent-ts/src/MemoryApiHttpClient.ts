import type { AgentConfig } from "./AgentConfig.js";
import type { JsonObject } from "./JsonTypes.js";

interface MemoryApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export class MemoryApiHttpClient {
  constructor(private readonly config: AgentConfig) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
    const payload = (await response.json()) as MemoryApiResponse<T> | JsonObject;
    if ("code" in payload && payload.code !== 200) {
      throw new Error(`memory api failed: ${payload.message}`);
    }
    return ("data" in payload ? payload.data : payload) as T;
  }
}
