import type { OpenAIChatTool } from "../../../../openai/chat/model/tool/OpenAIChatTool.js";
import { MemoryReadOpenAiToolDefinition } from "../model/read/MemoryReadOpenAiToolDefinition.js";
import { MemoryWriteOpenAiToolDefinition } from "../model/write/MemoryWriteOpenAiToolDefinition.js";

export class MemoryOpenAiToolDefinitions {
  private readonly readDefinition = new MemoryReadOpenAiToolDefinition();
  private readonly writeDefinition = new MemoryWriteOpenAiToolDefinition();

  list(): OpenAIChatTool[] {
    return [this.readDefinition.create(), this.writeDefinition.create()];
  }
}
