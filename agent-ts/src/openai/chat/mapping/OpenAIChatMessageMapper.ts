import type { ChatMessageDTO } from "../../../common/model/ChatStreamRequest.js";
import type { OpenAIChatMessage } from "../model/message/OpenAIChatMessage.js";

export class OpenAIChatMessageMapper {
  map(messages: ChatMessageDTO[]): OpenAIChatMessage[] {
    return messages.map((message) => ({ role: message.role, content: message.content }));
  }
}
