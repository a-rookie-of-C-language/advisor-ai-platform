import type { ChatMessageDTO } from "../../../../common/model/ChatStreamRequest.js";
import { PromptBuilder } from "../../../../prompt/PromptBuilder.js";

export class MemorySystemMessageFactory {
  create(prompt: string): ChatMessageDTO {
    return {
      role: "system",
      content: PromptBuilder.buildMemoryContextPrompt(prompt)
    };
  }
}
