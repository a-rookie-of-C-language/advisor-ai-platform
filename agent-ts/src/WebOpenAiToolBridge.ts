import type { JsonObject, JsonValue } from "./JsonTypes.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { WebFetchClient } from "./WebFetchClient.js";
import type { WebSearchClient } from "./WebSearchClient.js";

export class WebOpenAiToolBridge {
  constructor(
    private readonly webFetchClient?: WebFetchClient,
    private readonly webSearchClient?: WebSearchClient
  ) {}

  listTools(): OpenAIChatTool[] {
    const tools: OpenAIChatTool[] = [];
    if (this.webFetchClient) {
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
    if (this.webSearchClient) {
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

  canExecute(toolName: string): boolean {
    return (toolName === "web_fetch" && Boolean(this.webFetchClient)) || (toolName === "web_search" && Boolean(this.webSearchClient));
  }

  async executeTool(toolName: string, args: JsonObject): Promise<{ output: string; success: boolean }> {
    try {
      if (toolName === "web_fetch" && this.webFetchClient) {
        const page = await this.webFetchClient.fetchPage(this.readRequiredString(args, "url"));
        return {
          output: JSON.stringify({
            ok: Boolean(page),
            status: page ? "hit" : "miss",
            items: page ? [{ ...page }] : []
          }),
          success: Boolean(page)
        };
      }
      if (toolName === "web_search" && this.webSearchClient) {
        const results = await this.webSearchClient.search(this.readRequiredString(args, "query"));
        return {
          output: JSON.stringify({
            ok: results.length > 0,
            status: results.length > 0 ? "hit" : "miss",
            items: results.map((result) => ({ ...result }))
          }),
          success: results.length > 0
        };
      }
      throw new Error(`未知 web 工具: ${toolName}`);
    } catch (error) {
      return {
        output: JSON.stringify({
          ok: false,
          status: "error",
          message: error instanceof Error ? error.message : "web tool failed",
          items: []
        }),
        success: false
      };
    }
  }

  private readRequiredString(args: JsonObject, key: string): string {
    const value = this.readAliasedValue(args, key);
    if (typeof value !== "string" || !value) {
      throw new Error(`缺少必填字段: ${key}`);
    }
    return value;
  }

  private readAliasedValue(args: JsonObject, snakeKey: string): JsonValue | undefined {
    const camelKey = snakeKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return args[snakeKey] ?? args[camelKey];
  }
}
