import type { RagApiClient } from "../../../rag/api/core/RagApiClient.js";
import { RagContextBuilder as RagContextBuilderClass } from "../../../rag/context/core/RagContextBuilder.js";
import { RagOpenAiToolBridge as RagOpenAiToolBridgeClass } from "../../../rag/openAi/bridge/RagOpenAiToolBridge.js";
import { AgentRagFeatureComponents } from "../model/AgentRagFeatureComponents.js";

export class AgentRagFeatureComponentsFactory {
  create(ragClient: RagApiClient | undefined): AgentRagFeatureComponents {
    return new AgentRagFeatureComponents(
      ragClient ? new RagContextBuilderClass(ragClient) : undefined,
      ragClient ? new RagOpenAiToolBridgeClass(ragClient) : undefined
    );
  }
}
