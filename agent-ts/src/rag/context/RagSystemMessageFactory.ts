import type { ChatMessageDTO } from "../../common/ChatStreamRequest.js";

export class RagSystemMessageFactory {
  create(prompt: string): ChatMessageDTO {
    return {
      role: "system",
      content: `Knowledge-base context is available for this chat. Use it only when relevant.\n${prompt}`
    };
  }
}
