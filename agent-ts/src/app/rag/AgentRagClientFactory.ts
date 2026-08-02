import type { AgentConfig } from "../../config/AgentConfig.js";
import { RagApiClient } from "../../rag/RagApiClient.js";

export class AgentRagClientFactory {
  create(config: AgentConfig): RagApiClient | undefined {
    return config.ragApiBaseUrl ? new RagApiClient(config) : undefined;
  }
}
