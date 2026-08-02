import type { AgentConfig } from "../../config/AgentConfig.js";
import { MemoryApiClient } from "../../memory/MemoryApiClient.js";

export class AgentMemoryClientFactory {
  create(config: AgentConfig): MemoryApiClient | undefined {
    return config.memoryApiBaseUrl ? new MemoryApiClient(config) : undefined;
  }
}
