import { OpenAiToolRegistry } from "../../../../openai/tools/registry/core/registry/OpenAiToolRegistry.js";
import type { AgentMcpComponents } from "../../../mcp/core/AgentMcpComponents.js";
import type { AgentMemoryComponents } from "../../../memory/core/AgentMemoryComponents.js";
import type { AgentRagComponents } from "../../../rag/core/AgentRagComponents.js";
import type { AgentWebComponents } from "../../../web/core/AgentWebComponents.js";
import type { AgentWorkspaceComponents } from "../../../workspace/core/AgentWorkspaceComponents.js";
import type { SkillRegistry } from "../../../../skills/core/SkillRegistry.js";

export class AgentOpenAiToolRegistryFactory {
  create(
    memoryComponents: AgentMemoryComponents,
    ragComponents: AgentRagComponents,
    webComponents: AgentWebComponents,
    workspaceComponents: AgentWorkspaceComponents,
    mcpComponents: AgentMcpComponents,
    skillRegistry?: SkillRegistry
  ): OpenAiToolRegistry {
    return new OpenAiToolRegistry(
      workspaceComponents.openAiToolBridge,
      webComponents.openAiToolBridge,
      ragComponents.openAiToolBridge,
      memoryComponents.openAiToolBridge,
      mcpComponents.openAiToolBridge,
      skillRegistry
    );
  }
}
