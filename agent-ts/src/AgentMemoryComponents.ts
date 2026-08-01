import type { AgentConfig } from "./AgentConfig.js";
import { MemoryApiClient } from "./MemoryApiClient.js";
import type { MemoryContextBuilder } from "./MemoryContextBuilder.js";
import { MemoryContextBuilder as MemoryContextBuilderClass } from "./MemoryContextBuilder.js";
import type { MemoryOpenAiToolBridge } from "./MemoryOpenAiToolBridge.js";
import { MemoryOpenAiToolBridge as MemoryOpenAiToolBridgeClass } from "./MemoryOpenAiToolBridge.js";
import type { MemoryTaskSubmitter } from "./MemoryTaskSubmitter.js";
import { MemoryTaskSubmitter as MemoryTaskSubmitterClass } from "./MemoryTaskSubmitter.js";

export class AgentMemoryComponents {
  readonly contextBuilder?: MemoryContextBuilder;
  readonly openAiToolBridge?: MemoryOpenAiToolBridge;
  readonly taskSubmitter?: MemoryTaskSubmitter;

  constructor(config: AgentConfig) {
    const memoryClient = config.memoryApiBaseUrl ? new MemoryApiClient(config) : undefined;
    this.contextBuilder = memoryClient ? new MemoryContextBuilderClass(memoryClient, config.memoryTopK) : undefined;
    this.openAiToolBridge = memoryClient ? new MemoryOpenAiToolBridgeClass(memoryClient, config.memoryTopK) : undefined;
    this.taskSubmitter = memoryClient ? new MemoryTaskSubmitterClass(memoryClient) : undefined;
  }
}
