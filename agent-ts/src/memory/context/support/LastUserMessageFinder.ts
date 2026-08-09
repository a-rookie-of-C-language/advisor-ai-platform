import type { ChatMessageDTO } from "../../../common/model/ChatStreamRequest.js";

export class LastUserMessageFinder {
  find(messages: ChatMessageDTO[]): string {
    const userMessages = messages.filter((message) => message.role === "user" && message.content.trim());
    return userMessages.at(-1)?.content.trim() || "";
  }
}
