import type { AgentConfig } from "../../../config/model/AgentConfig.js";
import { MemoryApiClient } from "../../../memory/api/core/MemoryApiClient.js";

export class AgentMemoryClientFactory {
  create(config: AgentConfig): MemoryApiClient | undefined {
    return config.memoryApiBaseUrl ? new MemoryApiClient(config) : undefined;
  }
}
