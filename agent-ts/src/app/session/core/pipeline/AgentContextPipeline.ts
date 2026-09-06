import type { ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { MemoryContextBuilder } from "../../../../memory/context/core/MemoryContextBuilder.js";
import type { WebFetchContextBuilder } from "../../../../web/context/fetch/core/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../../../web/context/search/core/WebSearchContextBuilder.js";
import type { IntentRouteDecision } from "../../../../routing/model/IntentRouteDecision.js";

export class AgentContextPipeline {
  constructor(
    private readonly memoryContextBuilder?: MemoryContextBuilder,
    private readonly webFetchContextBuilder?: WebFetchContextBuilder,
    private readonly webSearchContextBuilder?: WebSearchContextBuilder
  ) {}

  async build(chatRequest: ChatStreamRequest, route?: IntentRouteDecision): Promise<ChatStreamRequest["messages"]> {
    let messages = chatRequest.messages;
    if (this.memoryContextBuilder && this.shouldLoad(route, "memory_read", "memory_write")) {
      messages = await this.memoryContextBuilder.injectMemory({ ...chatRequest, messages });
    }
    if (this.webFetchContextBuilder) {
      messages = await this.webFetchContextBuilder.injectWebFetch({ ...chatRequest, messages });
    }
    if (this.webSearchContextBuilder && this.shouldLoad(route, "search")) {
      messages = await this.webSearchContextBuilder.injectWebSearch({ ...chatRequest, messages });
    }
    return messages;
  }

  private shouldLoad(route: IntentRouteDecision | undefined, ...categories: string[]): boolean {
    return route === undefined || categories.some((category) => route.categories.has(category));
  }

  async transform(
    messages: ChatStreamRequest["messages"],
    _signal?: AbortSignal,
    route?: IntentRouteDecision
  ): Promise<ChatStreamRequest["messages"]> {
    let result = messages;
    if (this.memoryContextBuilder && this.shouldLoad(route, "memory_read", "memory_write")) {
      result = await this.memoryContextBuilder.injectMemory({ ...({ messages: result } as ChatStreamRequest), messages: result });
    }
    if (this.webFetchContextBuilder) {
      result = await this.webFetchContextBuilder.injectWebFetch({ ...({ messages: result } as ChatStreamRequest), messages: result });
    }
    if (this.webSearchContextBuilder && this.shouldLoad(route, "search")) {
      result = await this.webSearchContextBuilder.injectWebSearch({ ...({ messages: result } as ChatStreamRequest), messages: result });
    }
    return result;
  }
}
