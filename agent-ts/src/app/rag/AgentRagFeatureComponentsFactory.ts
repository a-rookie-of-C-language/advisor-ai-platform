import type { RagApiClient } from "../../rag/RagApiClient.js";
import { RagContextBuilder as RagContextBuilderClass } from "../../rag/RagContextBuilder.js";
import { RagOpenAiToolBridge as RagOpenAiToolBridgeClass } from "../../rag/RagOpenAiToolBridge.js";
import { AgentRagFeatureComponents } from "./AgentRagFeatureComponents.js";

export class AgentRagFeatureComponentsFactory {
  create(ragClient: RagApiClient | undefined): AgentRagFeatureComponents {
    return new AgentRagFeatureComponents(
      ragClient ? new RagContextBuilderClass(ragClient) : undefined,
      ragClient ? new RagOpenAiToolBridgeClass(ragClient) : undefined
    );
  }
}
