import type { JsonObject, JsonValue } from "./JsonTypes.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { WebFetchClient } from "./WebFetchClient.js";
import { OpenAiToolResultFactory } from "./OpenAiToolResultFactory.js";
import { WebOpenAiToolCatalog } from "./WebOpenAiToolCatalog.js";
import type { WebSearchClient } from "./WebSearchClient.js";

export class WebOpenAiToolBridge {
  private readonly catalog = new WebOpenAiToolCatalog();

  constructor(
    private readonly webFetchClient?: WebFetchClient,
    private readonly webSearchClient?: WebSearchClient
  ) {}

  listTools(): OpenAIChatTool[] {
    return this.catalog.listTools({
      webFetchEnabled: Boolean(this.webFetchClient),
      webSearchEnabled: Boolean(this.webSearchClient)
    });
  }

  canExecute(toolName: string): boolean {
    return (toolName === "web_fetch" && Boolean(this.webFetchClient)) || (toolName === "web_search" && Boolean(this.webSearchClient));
  }

  async executeTool(toolName: string, args: JsonObject): Promise<OpenAiToolExecutionResult> {
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
      return OpenAiToolResultFactory.error(error instanceof Error ? error.message : "web tool failed");
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
