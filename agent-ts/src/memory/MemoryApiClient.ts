import type { AgentConfig } from "../config/AgentConfig.js";
import { MemoryApiArrayResponseReader } from "./MemoryApiArrayResponseReader.js";
import { MemoryApiEndpointFactory } from "./MemoryApiEndpointFactory.js";
import { MemoryApiHttpClient } from "./MemoryApiHttpClient.js";
import { MemoryApiPostRequestFactory } from "./MemoryApiPostRequestFactory.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { MemoryCandidateUpsertRequest } from "./MemoryCandidateUpsertRequest.js";
import type { MemoryItem } from "./MemoryItem.js";
import type { MemoryTaskSubmitRequest } from "./MemoryTaskSubmitRequest.js";
import type { SessionSummary } from "../common/session/SessionSummary.js";

export class MemoryApiClient {
  private readonly arrayResponseReader = new MemoryApiArrayResponseReader();
  private readonly endpointFactory = new MemoryApiEndpointFactory();
  private readonly httpClient: MemoryApiHttpClient;
  private readonly postRequestFactory = new MemoryApiPostRequestFactory();

  constructor(config: AgentConfig) {
    this.httpClient = new MemoryApiHttpClient(config);
  }

  async searchLongTerm(userId: number, kbId: number, query: string, topK: number): Promise<MemoryItem[]> {
    const response = await this.httpClient.request<MemoryItem[]>(
      this.endpointFactory.longTermSearch(),
      this.postRequestFactory.createLongTermSearch(userId, kbId, query, topK)
    );
    return this.arrayResponseReader.read(response);
  }

  async getCoreMemories(userId: number, kbId: number): Promise<MemoryItem[]> {
    const response = await this.httpClient.request<MemoryItem[]>(this.endpointFactory.coreMemories(userId, kbId));
    return this.arrayResponseReader.read(response);
  }

  async getSessionSummary(sessionId: number): Promise<SessionSummary | null> {
    return this.httpClient.request<SessionSummary | null>(this.endpointFactory.sessionSummary(sessionId));
  }

  async upsertCandidates(params: MemoryCandidateUpsertRequest): Promise<JsonObject> {
    return this.httpClient.request<JsonObject>(
      this.endpointFactory.longTermCandidates(),
      this.postRequestFactory.createCandidateUpsert(params)
    );
  }

  async submitMemoryTask(params: MemoryTaskSubmitRequest): Promise<JsonObject> {
    return this.httpClient.request<JsonObject>(
      this.endpointFactory.memoryTaskSubmit(),
      this.postRequestFactory.createMemoryTaskSubmit(params)
    );
  }
}
