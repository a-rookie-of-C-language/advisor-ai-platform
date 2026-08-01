import type { OpenAIChatTool } from "./OpenAIChatTool.js";

export class WebOpenAiToolCatalog {
  listTools(options: { webFetchEnabled: boolean; webSearchEnabled: boolean }): OpenAIChatTool[] {
    const tools: OpenAIChatTool[] = [];
    if (options.webFetchEnabled) {
      tools.push({
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
      });
    }
    if (options.webSearchEnabled) {
      tools.push({
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
      });
    }
    return tools;
  }
}
