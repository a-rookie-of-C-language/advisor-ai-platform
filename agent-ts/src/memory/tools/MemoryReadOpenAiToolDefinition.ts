import type { OpenAIChatTool } from "../../openai/OpenAIChatTool.js";

export class MemoryReadOpenAiToolDefinition {
  create(): OpenAIChatTool {
    return {
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
    };
  }
}
