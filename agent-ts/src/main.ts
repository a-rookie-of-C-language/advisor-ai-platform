import { AgentConfig } from "./AgentConfig.js";
import { AgentCoreClient } from "./AgentCoreClient.js";
import { AgentHttpServer } from "./AgentHttpServer.js";
import { AgentRuntime } from "./AgentRuntime.js";
import { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryContextBuilder } from "./MemoryContextBuilder.js";
import { MemoryOpenAiToolBridge } from "./MemoryOpenAiToolBridge.js";
import { MemoryTaskSubmitter } from "./MemoryTaskSubmitter.js";
import { McpConfigParser } from "./McpConfigParser.js";
import { McpOpenAiToolBridge } from "./McpOpenAiToolBridge.js";
import { McpToolService } from "./McpToolService.js";
import { OpenAIChatClient } from "./OpenAIChatClient.js";
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

const config = AgentConfig.fromEnv();
const core = new AgentCoreClient(config.rustCorePath);
const openAiClient = new OpenAIChatClient(config);
const memoryClient = config.memoryApiBaseUrl ? new MemoryApiClient(config) : undefined;
const memoryContextBuilder = memoryClient ? new MemoryContextBuilder(memoryClient, config.memoryTopK) : undefined;
const memoryTaskSubmitter = memoryClient ? new MemoryTaskSubmitter(memoryClient) : undefined;
const memoryOpenAiToolBridge = memoryClient ? new MemoryOpenAiToolBridge(memoryClient, config.memoryTopK) : undefined;
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
const runtime = new AgentRuntime(
  config,
  core,
  openAiClient,
  memoryContextBuilder,
  memoryTaskSubmitter,
  ragContextBuilder,
  webFetchContextBuilder,
  webSearchContextBuilder,
  mcpOpenAiToolBridge,
  workspaceOpenAiToolBridge,
  webOpenAiToolBridge,
  ragOpenAiToolBridge,
  memoryOpenAiToolBridge
);
const server = new AgentHttpServer(config, runtime, workspaceManager, mcpToolService);

server.start();
