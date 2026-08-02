import type { AgentMcpComponents } from "../mcp/AgentMcpComponents.js";
import type { AgentMemoryComponents } from "../memory/AgentMemoryComponents.js";
import type { AgentRagComponents } from "../rag/AgentRagComponents.js";
import type { AgentWebComponents } from "../web/AgentWebComponents.js";
import type { AgentWorkspaceComponents } from "../workspace/AgentWorkspaceComponents.js";
import { OpenAiToolRegistry } from "../../openai/tools/registry/OpenAiToolRegistry.js";

export class AgentOpenAiToolRegistryFactory {
  create(
    memoryComponents: AgentMemoryComponents,
    ragComponents: AgentRagComponents,
    webComponents: AgentWebComponents,
    workspaceComponents: AgentWorkspaceComponents,
    mcpComponents: AgentMcpComponents
  ): OpenAiToolRegistry {
    return new OpenAiToolRegistry(
      workspaceComponents.openAiToolBridge,
      webComponents.openAiToolBridge,
      ragComponents.openAiToolBridge,
      memoryComponents.openAiToolBridge,
      mcpComponents.openAiToolBridge
    );
  }
}
