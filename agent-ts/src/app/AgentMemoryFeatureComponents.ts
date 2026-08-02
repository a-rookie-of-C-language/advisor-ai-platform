import type { MemoryContextBuilder } from "../memory/MemoryContextBuilder.js";
import type { MemoryOpenAiToolBridge } from "../memory/MemoryOpenAiToolBridge.js";
import type { MemoryTaskSubmitter } from "../memory/MemoryTaskSubmitter.js";

export class AgentMemoryFeatureComponents {
  constructor(
    readonly contextBuilder?: MemoryContextBuilder,
    readonly openAiToolBridge?: MemoryOpenAiToolBridge,
    readonly taskSubmitter?: MemoryTaskSubmitter
  ) {}
}
