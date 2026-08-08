import type { AgentConfig } from "../../../../config/model/core/AgentConfig.js";
import { RagApiClient } from "../../../../rag/api/core/RagApiClient.js";

export class AgentRagClientFactory {
  create(config: AgentConfig): RagApiClient | undefined {
    return config.ragApiBaseUrl ? new RagApiClient(config) : undefined;
  }
}
