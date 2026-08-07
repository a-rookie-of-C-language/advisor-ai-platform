import type { MemoryContextBuilder } from "../../../memory/context/core/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../../../memory/task/MemoryTaskSubmitter.js";
import type { MemoryOpenAiToolBridge } from "../../../memory/tools/core/bridge/MemoryOpenAiToolBridge.js";

export class AgentMemoryFeatureComponents {
  constructor(
    readonly contextBuilder?: MemoryContextBuilder,
    readonly openAiToolBridge?: MemoryOpenAiToolBridge,
    readonly taskSubmitter?: MemoryTaskSubmitter
  ) {}
}
