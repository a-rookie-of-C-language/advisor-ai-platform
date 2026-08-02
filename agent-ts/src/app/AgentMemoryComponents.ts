import type { AgentConfig } from "../config/AgentConfig.js";
import type { MemoryContextBuilder } from "../memory/MemoryContextBuilder.js";
import { MemoryContextBuilder as MemoryContextBuilderClass } from "../memory/MemoryContextBuilder.js";
import type { MemoryOpenAiToolBridge } from "../memory/MemoryOpenAiToolBridge.js";
import { MemoryOpenAiToolBridge as MemoryOpenAiToolBridgeClass } from "../memory/MemoryOpenAiToolBridge.js";
import type { MemoryTaskSubmitter } from "../memory/MemoryTaskSubmitter.js";
import { MemoryTaskSubmitter as MemoryTaskSubmitterClass } from "../memory/MemoryTaskSubmitter.js";
import { AgentMemoryClientFactory } from "./AgentMemoryClientFactory.js";

export class AgentMemoryComponents {
  readonly contextBuilder?: MemoryContextBuilder;
  readonly openAiToolBridge?: MemoryOpenAiToolBridge;
  readonly taskSubmitter?: MemoryTaskSubmitter;

  constructor(config: AgentConfig) {
    const memoryClient = new AgentMemoryClientFactory().create(config);
    this.contextBuilder = memoryClient ? new MemoryContextBuilderClass(memoryClient, config.memoryTopK) : undefined;
    this.openAiToolBridge = memoryClient ? new MemoryOpenAiToolBridgeClass(memoryClient, config.memoryTopK) : undefined;
    this.taskSubmitter = memoryClient ? new MemoryTaskSubmitterClass(memoryClient) : undefined;
  }
}
