import type { ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { MemoryContextBuilder } from "../../../../memory/context/core/MemoryContextBuilder.js";
import type { RagContextBuilder } from "../../../../rag/context/core/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../../../../web/context/fetch/core/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../../../web/context/search/core/WebSearchContextBuilder.js";

export class AgentContextPipeline {
  constructor(
    private readonly memoryContextBuilder?: MemoryContextBuilder,
    private readonly ragContextBuilder?: RagContextBuilder,
    private readonly webFetchContextBuilder?: WebFetchContextBuilder,
    private readonly webSearchContextBuilder?: WebSearchContextBuilder
  ) {}

  async build(chatRequest: ChatStreamRequest): Promise<ChatStreamRequest["messages"]> {
    let messages = chatRequest.messages;
    if (this.memoryContextBuilder) {
      messages = await this.memoryContextBuilder.injectMemory({ ...chatRequest, messages });
    }
    if (this.ragContextBuilder) {
      messages = await this.ragContextBuilder.injectRag({ ...chatRequest, messages });
    }
    if (this.webFetchContextBuilder) {
      messages = await this.webFetchContextBuilder.injectWebFetch({ ...chatRequest, messages });
    }
    if (this.webSearchContextBuilder) {
      messages = await this.webSearchContextBuilder.injectWebSearch({ ...chatRequest, messages });
    }
    return messages;
  }

  async transform(
    messages: ChatStreamRequest["messages"],
    _signal?: AbortSignal
  ): Promise<ChatStreamRequest["messages"]> {
    let result = messages;
    if (this.memoryContextBuilder) {
      result = await this.memoryContextBuilder.injectMemory({ ...({ messages: result } as ChatStreamRequest), messages: result });
    }
    if (this.ragContextBuilder) {
      result = await this.ragContextBuilder.injectRag({ ...({ messages: result } as ChatStreamRequest), messages: result });
    }
    if (this.webFetchContextBuilder) {
      result = await this.webFetchContextBuilder.injectWebFetch({ ...({ messages: result } as ChatStreamRequest), messages: result });
    }
    if (this.webSearchContextBuilder) {
      result = await this.webSearchContextBuilder.injectWebSearch({ ...({ messages: result } as ChatStreamRequest), messages: result });
    }
    return result;
  }
}
