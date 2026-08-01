import { AgentConfig } from "./AgentConfig.js";
import { AgentCoreClient } from "./AgentCoreClient.js";
import { AgentHttpServer } from "./AgentHttpServer.js";
import { AgentRuntime } from "./AgentRuntime.js";
import { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryContextBuilder } from "./MemoryContextBuilder.js";
import { MemoryTaskSubmitter } from "./MemoryTaskSubmitter.js";
import { OpenAIChatClient } from "./OpenAIChatClient.js";
import { RagApiClient } from "./RagApiClient.js";
import { RagContextBuilder } from "./RagContextBuilder.js";
import { WebFetchClient } from "./WebFetchClient.js";
import { WebFetchContextBuilder } from "./WebFetchContextBuilder.js";
import { WebSearchClient } from "./WebSearchClient.js";
import { WebSearchContextBuilder } from "./WebSearchContextBuilder.js";

const config = AgentConfig.fromEnv();
const core = new AgentCoreClient(config.rustCorePath);
const openAiClient = new OpenAIChatClient(config);
const memoryClient = config.memoryApiBaseUrl ? new MemoryApiClient(config) : undefined;
const memoryContextBuilder = memoryClient ? new MemoryContextBuilder(memoryClient, config.memoryTopK) : undefined;
const memoryTaskSubmitter = memoryClient ? new MemoryTaskSubmitter(memoryClient) : undefined;
const ragClient = config.ragApiBaseUrl ? new RagApiClient(config) : undefined;
const ragContextBuilder = ragClient ? new RagContextBuilder(ragClient) : undefined;
const webFetchClient = config.webFetchEnabled ? new WebFetchClient(config) : undefined;
const webFetchContextBuilder = webFetchClient ? new WebFetchContextBuilder(webFetchClient) : undefined;
const webSearchClient = config.webSearchEnabled && config.webSearchApiKey ? new WebSearchClient(config) : undefined;
const webSearchContextBuilder = webSearchClient ? new WebSearchContextBuilder(webSearchClient) : undefined;
const runtime = new AgentRuntime(
  config,
  core,
  openAiClient,
  memoryContextBuilder,
  memoryTaskSubmitter,
  ragContextBuilder,
  webFetchContextBuilder,
  webSearchContextBuilder
);
const server = new AgentHttpServer(config, runtime);

server.start();
