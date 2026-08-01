import { AgentConfig } from "./AgentConfig.js";
import { AgentCoreClient } from "./AgentCoreClient.js";
import { AgentHttpServer } from "./AgentHttpServer.js";
import { AgentRuntime } from "./AgentRuntime.js";
import { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryContextBuilder } from "./MemoryContextBuilder.js";
import { MemoryTaskSubmitter } from "./MemoryTaskSubmitter.js";
import { OpenAIChatClient } from "./OpenAIChatClient.js";

const config = AgentConfig.fromEnv();
const core = new AgentCoreClient(config.rustCorePath);
const openAiClient = new OpenAIChatClient(config);
const memoryClient = config.memoryApiBaseUrl ? new MemoryApiClient(config) : undefined;
const memoryContextBuilder = memoryClient ? new MemoryContextBuilder(memoryClient, config.memoryTopK) : undefined;
const memoryTaskSubmitter = memoryClient ? new MemoryTaskSubmitter(memoryClient) : undefined;
const runtime = new AgentRuntime(config, core, openAiClient, memoryContextBuilder, memoryTaskSubmitter);
const server = new AgentHttpServer(config, runtime);

server.start();
