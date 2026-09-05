import type { OpenAIChatTool } from "../../../openai/chat/model/tool/OpenAIChatTool.js";
import { extractFirstUrl } from "../../../graph/helpers.js";
import type { ToolExplorerResult } from "../model/ToolExplorerResult.js";

export class ToolExplorer {
  explore(query: string, tools: readonly OpenAIChatTool[], routeCategories: ReadonlySet<string>): ToolExplorerResult {
    const normalized = query.trim().toLowerCase();
    const routeNames = new Set<string>();
    if (routeCategories.has("retrieval")) routeNames.add("rag_search");
    if (routeCategories.has("search")) routeNames.add("web_search");
    if (routeCategories.has("memory_read") || routeCategories.has("memory_write")) routeNames.add("memory");

    const matched = tools
      .filter((tool) => {
        const name = tool.function.name.toLowerCase();
        const text = `${name} ${tool.function.description.toLowerCase()}`;
        return [...routeNames].some((routeName) => name.includes(routeName)) ||
          (name.includes("web_fetch") && extractFirstUrl(query).length > 0) ||
          (normalized.length > 0 && normalized.split(/\s+/u).some((token) => token.length > 1 && text.includes(token)));
      })
      .map((tool) => tool.function.name);

    if (matched.length === 0) return { matchedTools: [], reason: "none" };
    return {
      matchedTools: [...new Set(matched)],
      reason: routeNames.size > 0 ? "route_match" : "text_match"
    };
  }
}
