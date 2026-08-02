import type { RagContextBuilder } from "../../rag/RagContextBuilder.js";
import type { RagOpenAiToolBridge } from "../../rag/RagOpenAiToolBridge.js";

export class AgentRagFeatureComponents {
  constructor(
    readonly contextBuilder?: RagContextBuilder,
    readonly openAiToolBridge?: RagOpenAiToolBridge
  ) {}
}
