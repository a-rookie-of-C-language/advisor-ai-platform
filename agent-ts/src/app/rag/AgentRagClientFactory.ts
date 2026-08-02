import type { AgentConfig } from "../../config/model/AgentConfig.js";
import { RagApiClient } from "../../rag/api/RagApiClient.js";

export class AgentRagClientFactory {
  create(config: AgentConfig): RagApiClient | undefined {
    return config.ragApiBaseUrl ? new RagApiClient(config) : undefined;
  }
}
