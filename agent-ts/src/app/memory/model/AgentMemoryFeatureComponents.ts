import type { MemoryContextBuilder } from "../../../memory/context/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../../../memory/task/MemoryTaskSubmitter.js";
import type { MemoryOpenAiToolBridge } from "../../../memory/tools/core/MemoryOpenAiToolBridge.js";

export class AgentMemoryFeatureComponents {
  constructor(
    readonly contextBuilder?: MemoryContextBuilder,
    readonly openAiToolBridge?: MemoryOpenAiToolBridge,
    readonly taskSubmitter?: MemoryTaskSubmitter
  ) {}
}
