import type { OpenAIChatTool } from "../../openai/chat/OpenAIChatTool.js";

export class WebFetchOpenAiToolDefinition {
  create(): OpenAIChatTool {
    return {
      type: "function",
      function: {
        name: "web_fetch",
        description: "抓取指定 URL 的网页正文文本，用于读取用户给出的链接。",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "需要抓取的 http/https URL" }
          },
          required: ["url"]
        }
      }
    };
  }
}
