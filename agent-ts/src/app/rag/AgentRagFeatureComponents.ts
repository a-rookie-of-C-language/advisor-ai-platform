import type { RagContextBuilder } from "../../rag/context/RagContextBuilder.js";
import type { RagOpenAiToolBridge } from "../../rag/RagOpenAiToolBridge.js";

export class AgentRagFeatureComponents {
  constructor(
    readonly contextBuilder?: RagContextBuilder,
    readonly openAiToolBridge?: RagOpenAiToolBridge
  ) {}
}
