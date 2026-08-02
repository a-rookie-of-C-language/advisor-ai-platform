import type { OpenAIChatTool } from "../../../openai/chat/model/OpenAIChatTool.js";
import { MemoryReadOpenAiToolDefinition } from "./MemoryReadOpenAiToolDefinition.js";
import { MemoryWriteOpenAiToolDefinition } from "./MemoryWriteOpenAiToolDefinition.js";

export class MemoryOpenAiToolDefinitions {
  private readonly readDefinition = new MemoryReadOpenAiToolDefinition();
  private readonly writeDefinition = new MemoryWriteOpenAiToolDefinition();

  list(): OpenAIChatTool[] {
    return [this.readDefinition.create(), this.writeDefinition.create()];
  }
}
