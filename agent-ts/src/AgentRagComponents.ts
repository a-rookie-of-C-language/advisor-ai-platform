import type { AgentConfig } from "./AgentConfig.js";
import { RagApiClient } from "./RagApiClient.js";
import type { RagContextBuilder } from "./RagContextBuilder.js";
import { RagContextBuilder as RagContextBuilderClass } from "./RagContextBuilder.js";
import type { RagOpenAiToolBridge } from "./RagOpenAiToolBridge.js";
import { RagOpenAiToolBridge as RagOpenAiToolBridgeClass } from "./RagOpenAiToolBridge.js";

export class AgentRagComponents {
  readonly contextBuilder?: RagContextBuilder;
  readonly openAiToolBridge?: RagOpenAiToolBridge;

  constructor(config: AgentConfig) {
    const ragClient = config.ragApiBaseUrl ? new RagApiClient(config) : undefined;
    this.contextBuilder = ragClient ? new RagContextBuilderClass(ragClient) : undefined;
    this.openAiToolBridge = ragClient ? new RagOpenAiToolBridgeClass(ragClient) : undefined;
  }
}
