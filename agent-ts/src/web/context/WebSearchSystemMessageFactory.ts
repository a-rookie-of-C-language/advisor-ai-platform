import type { ChatMessageDTO } from "../../common/ChatStreamRequest.js";

export class WebSearchSystemMessageFactory {
  create(renderedResults: string): ChatMessageDTO {
    return {
      role: "system",
      content: `Fresh web search context is available. Use it only when relevant and cite source URLs when using it.\n${renderedResults}`
    };
  }
}
