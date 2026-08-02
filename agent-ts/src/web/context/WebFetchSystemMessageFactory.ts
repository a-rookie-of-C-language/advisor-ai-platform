import type { ChatMessageDTO } from "../../common/ChatStreamRequest.js";

export class WebFetchSystemMessageFactory {
  create(renderedPages: string): ChatMessageDTO {
    return {
      role: "system",
      content: `Fetched web context is available. Use it only when relevant and cite the page URL when using it.\n${renderedPages}`
    };
  }
}
