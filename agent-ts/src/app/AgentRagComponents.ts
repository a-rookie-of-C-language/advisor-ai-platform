import type { AgentConfig } from "../config/AgentConfig.js";
import { RagApiClient } from "../rag/RagApiClient.js";
import type { RagContextBuilder } from "../rag/RagContextBuilder.js";
import { RagContextBuilder as RagContextBuilderClass } from "../rag/RagContextBuilder.js";
import type { RagOpenAiToolBridge } from "../rag/RagOpenAiToolBridge.js";
import { RagOpenAiToolBridge as RagOpenAiToolBridgeClass } from "../rag/RagOpenAiToolBridge.js";

export class AgentRagComponents {
  readonly contextBuilder?: RagContextBuilder;
  readonly openAiToolBridge?: RagOpenAiToolBridge;

  constructor(config: AgentConfig) {
    const ragClient = config.ragApiBaseUrl ? new RagApiClient(config) : undefined;
    this.contextBuilder = ragClient ? new RagContextBuilderClass(ragClient) : undefined;
    this.openAiToolBridge = ragClient ? new RagOpenAiToolBridgeClass(ragClient) : undefined;
  }
}
