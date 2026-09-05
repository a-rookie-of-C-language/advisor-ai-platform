import type { OpenAIChatTool } from "../../../../../openai/chat/model/tool/OpenAIChatTool.js";

export class MemoryWriteOpenAiToolDefinition {
  create(): OpenAIChatTool {
    return {
      type: "function",
      function: {
        name: "memory_write",
        description: "将用户明确要求记住的内容写入长期记忆。",
        parameters: {
          type: "object",
          properties: {
            candidates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string", description: "要保存的记忆内容" },
                  confidence: { type: "number", description: "置信度，0 到 1，默认 0.5" },
                  source_turn_id: { type: "string", description: "来源 turnId，可选" },
                  tags: { type: "object", description: "附加标签，可选" },
                  memory_type: { type: "string", description: "记忆类型，可选" },
                  is_core: { type: "boolean", description: "是否核心记忆，可选" }
                },
                required: ["content"]
              },
              minItems: 1
            }
          },
          required: ["candidates"]
        }
      },
      meta: {
        category: "memory",
        readOnly: false,
        searchHint: "记住,保存记忆,长期记忆"
      }
    };
  }
}
