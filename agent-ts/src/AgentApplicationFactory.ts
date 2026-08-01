import { AgentConfig } from "./AgentConfig.js";
import { AgentCoreClient } from "./AgentCoreClient.js";
import { AgentHttpServer } from "./AgentHttpServer.js";
import { AgentMemoryComponents } from "./AgentMemoryComponents.js";
import { AgentMcpComponents } from "./AgentMcpComponents.js";
import { AgentRagComponents } from "./AgentRagComponents.js";
import { AgentRuntime } from "./AgentRuntime.js";
import { AgentWebComponents } from "./AgentWebComponents.js";
import { AgentWorkspaceComponents } from "./AgentWorkspaceComponents.js";
import { OpenAIChatClient } from "./OpenAIChatClient.js";
import { OpenAiToolRegistry } from "./OpenAiToolRegistry.js";

export class AgentApplicationFactory {
  createServer(): AgentHttpServer {
    const config = AgentConfig.fromEnv();
    const core = new AgentCoreClient(config.rustCorePath);
    const openAiClient = new OpenAIChatClient(config);
    const memoryComponents = new AgentMemoryComponents(config);
    const ragComponents = new AgentRagComponents(config);
    const webComponents = new AgentWebComponents(config);
    const mcpComponents = new AgentMcpComponents(config);
    const workspaceComponents = new AgentWorkspaceComponents(config);
    const openAiToolRegistry = new OpenAiToolRegistry(
      workspaceComponents.openAiToolBridge,
      webComponents.openAiToolBridge,
      ragComponents.openAiToolBridge,
      memoryComponents.openAiToolBridge,
      mcpComponents.openAiToolBridge
    );
    const runtime = new AgentRuntime(
      config,
      core,
      openAiClient,
      memoryComponents.contextBuilder,
      memoryComponents.taskSubmitter,
      ragComponents.contextBuilder,
      webComponents.fetchContextBuilder,
      webComponents.searchContextBuilder,
      openAiToolRegistry
    );
    return new AgentHttpServer(config, runtime, workspaceComponents.manager, mcpComponents.toolService);
  }
}
