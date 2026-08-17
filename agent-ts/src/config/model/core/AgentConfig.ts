import { AgentConfigFactory } from "../../factory/AgentConfigFactory.js";
import type { AgentConfigValues } from "../values/AgentConfigValues.js";

export class AgentConfig {
  readonly host: string;
  readonly port: number;
  readonly token: string;
  readonly openAiApiKey: string;
  readonly openAiBaseUrl: string;
  readonly openAiModel: string;
  readonly openAiModels: string[];
  readonly openAiTemperature: number;
  readonly requestTimeoutMs: number;
  readonly rustCoreEnabled: boolean;
  readonly rustCorePath: string | undefined;
  readonly workspaceBasePath: string;
  readonly memoryApiBaseUrl: string;
  readonly memoryApiToken: string;
  readonly memoryTopK: number;
  readonly ragApiBaseUrl: string;
  readonly ragApiToken: string;
  readonly webFetchEnabled: boolean;
  readonly webFetchMaxContentLength: number;
  readonly webSearchEnabled: boolean;
  readonly webSearchApiKey: string;
  readonly webSearchUrl: string;
  readonly webSearchMaxResults: number;
  readonly mcpToolsEnabled: boolean;
  readonly mcpServers: string;
  readonly contextWindowTokens: number;
  readonly contextReserveTokens: number;
  readonly contextKeepLastMessages: number;
  readonly failureMemoryPath: string;
  readonly failureMemoryScoreThreshold: number;

  constructor(values: AgentConfigValues) {
    this.host = values.host;
    this.port = values.port;
    this.token = values.token;
    this.openAiApiKey = values.openAiApiKey;
    this.openAiBaseUrl = values.openAiBaseUrl;
    this.openAiModel = values.openAiModel;
    this.openAiModels = values.openAiModels;
    this.openAiTemperature = values.openAiTemperature;
    this.requestTimeoutMs = values.requestTimeoutMs;
    this.rustCoreEnabled = values.rustCoreEnabled;
    this.rustCorePath = values.rustCorePath;
    this.workspaceBasePath = values.workspaceBasePath;
    this.memoryApiBaseUrl = values.memoryApiBaseUrl;
    this.memoryApiToken = values.memoryApiToken;
    this.memoryTopK = values.memoryTopK;
    this.ragApiBaseUrl = values.ragApiBaseUrl;
    this.ragApiToken = values.ragApiToken;
    this.webFetchEnabled = values.webFetchEnabled;
    this.webFetchMaxContentLength = values.webFetchMaxContentLength;
    this.webSearchEnabled = values.webSearchEnabled;
    this.webSearchApiKey = values.webSearchApiKey;
    this.webSearchUrl = values.webSearchUrl;
    this.webSearchMaxResults = values.webSearchMaxResults;
    this.mcpToolsEnabled = values.mcpToolsEnabled;
    this.mcpServers = values.mcpServers;
    this.contextWindowTokens = values.contextWindowTokens;
    this.contextReserveTokens = values.contextReserveTokens;
    this.contextKeepLastMessages = values.contextKeepLastMessages;
    this.failureMemoryPath = values.failureMemoryPath;
    this.failureMemoryScoreThreshold = values.failureMemoryScoreThreshold;
  }

  static fromEnv(): AgentConfig {
    return new AgentConfig(new AgentConfigFactory().fromEnv());
  }
}
