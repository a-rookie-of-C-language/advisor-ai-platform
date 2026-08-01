import { AgentConfig } from "./AgentConfig.js";
import { AgentCoreClient } from "./AgentCoreClient.js";
import { AgentHttpServer } from "./AgentHttpServer.js";
import { AgentMemoryComponents } from "./AgentMemoryComponents.js";
import { AgentRagComponents } from "./AgentRagComponents.js";
import { AgentRuntime } from "./AgentRuntime.js";
import { AgentWebComponents } from "./AgentWebComponents.js";
import { McpConfigParser } from "./McpConfigParser.js";
import { McpOpenAiToolBridge } from "./McpOpenAiToolBridge.js";
import { McpToolService } from "./McpToolService.js";
import { OpenAIChatClient } from "./OpenAIChatClient.js";
import { OpenAiToolRegistry } from "./OpenAiToolRegistry.js";
import { WorkspaceManager } from "./WorkspaceManager.js";
import { WorkspaceOpenAiToolBridge } from "./WorkspaceOpenAiToolBridge.js";

export class AgentApplicationFactory {
  createServer(): AgentHttpServer {
    const config = AgentConfig.fromEnv();
    const core = new AgentCoreClient(config.rustCorePath);
    const openAiClient = new OpenAIChatClient(config);
    const memoryComponents = new AgentMemoryComponents(config);
    const ragComponents = new AgentRagComponents(config);
    const webComponents = new AgentWebComponents(config);
    const mcpConfigs = config.mcpToolsEnabled ? new McpConfigParser().parseServerConfigs(config.mcpServers) : [];
    const mcpToolService = mcpConfigs.length > 0 ? new McpToolService(mcpConfigs) : undefined;
    const mcpOpenAiToolBridge = mcpToolService ? new McpOpenAiToolBridge(mcpToolService) : undefined;
    const workspaceManager = new WorkspaceManager(config.workspaceBasePath);
    const workspaceOpenAiToolBridge = new WorkspaceOpenAiToolBridge(workspaceManager);
    const openAiToolRegistry = new OpenAiToolRegistry(
      workspaceOpenAiToolBridge,
      webComponents.openAiToolBridge,
      ragComponents.openAiToolBridge,
      memoryComponents.openAiToolBridge,
      mcpOpenAiToolBridge
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
    return new AgentHttpServer(config, runtime, workspaceManager, mcpToolService);
  }
}
