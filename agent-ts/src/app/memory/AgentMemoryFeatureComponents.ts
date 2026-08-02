import type { MemoryContextBuilder } from "../../memory/context/MemoryContextBuilder.js";
import type { MemoryOpenAiToolBridge } from "../../memory/tools/MemoryOpenAiToolBridge.js";
import type { MemoryTaskSubmitter } from "../../memory/task/MemoryTaskSubmitter.js";

export class AgentMemoryFeatureComponents {
  constructor(
    readonly contextBuilder?: MemoryContextBuilder,
    readonly openAiToolBridge?: MemoryOpenAiToolBridge,
    readonly taskSubmitter?: MemoryTaskSubmitter
  ) {}
}
