import type { ChatMessageDTO } from "../../common/ChatStreamRequest.js";
import type { OpenAIChatMessage } from "./OpenAIChatMessage.js";

export class OpenAIChatMessageMapper {
  map(messages: ChatMessageDTO[]): OpenAIChatMessage[] {
    return messages.map((message) => ({ role: message.role, content: message.content }));
  }
}
