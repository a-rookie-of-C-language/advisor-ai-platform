import type { OpenAIChatTool } from "../../openai/chat/model/OpenAIChatTool.js";

export class WebSearchOpenAiToolDefinition {
  create(): OpenAIChatTool {
    return {
      type: "function",
      function: {
        name: "web_search",
        description: "搜索实时网页信息，用于最新新闻、价格、政策、当前事实等问题。",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "搜索关键词或用户问题" }
          },
          required: ["query"]
        }
      }
    };
  }
}
