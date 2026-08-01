import type { OpenAIChatTool } from "../openai/OpenAIChatTool.js";

export class MemoryOpenAiToolDefinitions {
  list(): OpenAIChatTool[] {
    return [
      {
        type: "function",
        function: {
          name: "memory_read",
          description: "按查询读取用户长期记忆，用于回忆用户偏好、历史信息或已保存事实。",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "查询关键词或用户问题" },
              top_k: { type: "integer", description: "返回记忆数量，默认使用系统配置，最大 10" }
            }
          }
        }
      },
      {
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
        }
      }
    ];
  }
}
