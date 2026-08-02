import type { OpenAIChatTool } from "../../openai/chat/OpenAIChatTool.js";
import { MemoryReadOpenAiToolDefinition } from "./definitions/MemoryReadOpenAiToolDefinition.js";
import { MemoryWriteOpenAiToolDefinition } from "./definitions/MemoryWriteOpenAiToolDefinition.js";

export class MemoryOpenAiToolDefinitions {
  private readonly readDefinition = new MemoryReadOpenAiToolDefinition();
  private readonly writeDefinition = new MemoryWriteOpenAiToolDefinition();

  list(): OpenAIChatTool[] {
    return [this.readDefinition.create(), this.writeDefinition.create()];
  }
}
