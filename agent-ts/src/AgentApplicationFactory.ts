import { AgentConfig } from "./AgentConfig.js";
import { AgentCoreClient } from "./AgentCoreClient.js";
import { AgentHttpServer } from "./AgentHttpServer.js";
import { AgentMemoryComponents } from "./AgentMemoryComponents.js";
import { AgentRuntime } from "./AgentRuntime.js";
import { McpConfigParser } from "./McpConfigParser.js";
import { McpOpenAiToolBridge } from "./McpOpenAiToolBridge.js";
import { McpToolService } from "./McpToolService.js";
import { OpenAIChatClient } from "./OpenAIChatClient.js";
import { OpenAiToolRegistry } from "./OpenAiToolRegistry.js";
import { RagApiClient } from "./RagApiClient.js";
import { RagContextBuilder } from "./RagContextBuilder.js";
import { RagOpenAiToolBridge } from "./RagOpenAiToolBridge.js";
import { WebFetchClient } from "./WebFetchClient.js";
import { WebFetchContextBuilder } from "./WebFetchContextBuilder.js";
import { WebOpenAiToolBridge } from "./WebOpenAiToolBridge.js";
import { WebSearchClient } from "./WebSearchClient.js";
import { WebSearchContextBuilder } from "./WebSearchContextBuilder.js";
import { WorkspaceManager } from "./WorkspaceManager.js";
import { WorkspaceOpenAiToolBridge } from "./WorkspaceOpenAiToolBridge.js";

export class AgentApplicationFactory {
  createServer(): AgentHttpServer {
    const config = AgentConfig.fromEnv();
    const core = new AgentCoreClient(config.rustCorePath);
    const openAiClient = new OpenAIChatClient(config);
    const memoryComponents = new AgentMemoryComponents(config);
    const ragClient = config.ragApiBaseUrl ? new RagApiClient(config) : undefined;
    const ragContextBuilder = ragClient ? new RagContextBuilder(ragClient) : undefined;
    const ragOpenAiToolBridge = ragClient ? new RagOpenAiToolBridge(ragClient) : undefined;
    const webFetchClient = config.webFetchEnabled ? new WebFetchClient(config) : undefined;
    const webFetchContextBuilder = webFetchClient ? new WebFetchContextBuilder(webFetchClient) : undefined;
    const webSearchClient = config.webSearchEnabled && config.webSearchApiKey ? new WebSearchClient(config) : undefined;
    const webSearchContextBuilder = webSearchClient ? new WebSearchContextBuilder(webSearchClient) : undefined;
    const mcpConfigs = config.mcpToolsEnabled ? new McpConfigParser().parseServerConfigs(config.mcpServers) : [];
    const mcpToolService = mcpConfigs.length > 0 ? new McpToolService(mcpConfigs) : undefined;
    const mcpOpenAiToolBridge = mcpToolService ? new McpOpenAiToolBridge(mcpToolService) : undefined;
    const workspaceManager = new WorkspaceManager(config.workspaceBasePath);
    const workspaceOpenAiToolBridge = new WorkspaceOpenAiToolBridge(workspaceManager);
    const webOpenAiToolBridge = new WebOpenAiToolBridge(webFetchClient, webSearchClient);
    const openAiToolRegistry = new OpenAiToolRegistry(
      workspaceOpenAiToolBridge,
      webOpenAiToolBridge,
      ragOpenAiToolBridge,
      memoryComponents.openAiToolBridge,
      mcpOpenAiToolBridge
    );
    const runtime = new AgentRuntime(
      config,
      core,
      openAiClient,
      memoryComponents.contextBuilder,
      memoryComponents.taskSubmitter,
      ragContextBuilder,
      webFetchContextBuilder,
      webSearchContextBuilder,
      openAiToolRegistry
    );
    return new AgentHttpServer(config, runtime, workspaceManager, mcpToolService);
  }
}
