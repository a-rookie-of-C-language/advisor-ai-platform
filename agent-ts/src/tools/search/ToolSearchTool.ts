import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { OpenAIChatTool } from "../../openai/chat/model/tool/OpenAIChatTool.js";

export interface ToolSearchSpec {
  readonly name: string;
  readonly description: string;
  readonly parameters: JsonObject;
  readonly searchHint?: string;
}

export class ToolSearchTool {
  constructor(private readonly specsProvider: () => Promise<readonly ToolSearchSpec[]> | readonly ToolSearchSpec[]) {}

  create(): OpenAIChatTool {
    return {
      type: "function",
      function: {
        name: "tool_search",
        description: "按关键词搜索可用的延迟加载工具，获取其完整输入参数 schema。",
        parameters: {
          type: "object",
          properties: {
            keywords: { type: "string" },
            max_results: { type: "number" }
          },
          required: ["keywords"]
        }
      }
    };
  }

  async execute(keywords: string, maxResults = 3): Promise<JsonObject> {
    const tokens = keywords
      .split(/\s+/u)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (tokens.length === 0) {
      return { ok: false, status: "error", message: "tool_search: empty keywords", items: [] };
    }

    const candidates = [...(await this.specsProvider())];
    const scored: Array<[number, ToolSearchSpec]> = [];
    for (const spec of candidates) {
      if (spec.name === "tool_search") continue;
      const text = `${spec.name} ${spec.description} ${spec.searchHint ?? ""}`.toLowerCase();
      const score = tokens.reduce((total, token) => total + (text.includes(token) ? 1 : 0), 0);
      if (score > 0) scored.push([score, spec]);
    }

    scored.sort((left, right) => right[0] - left[0]);
    const top = scored.slice(0, Math.max(1, Math.min(10, maxResults)));
    if (top.length === 0) {
      return {
        ok: true,
        status: "miss",
        message: "未找到匹配的工具，尝试更换关键词",
        items: []
      };
    }

    return {
      ok: true,
      status: "hit",
      message: `找到 ${top.length} 个匹配工具`,
      items: top.map(([, spec]) => ({
        tool_name: spec.name,
        description: spec.description,
        parameters: spec.parameters,
        schema_text: `工具名称: ${spec.name}\n描述: ${spec.description}\n输入参数 (JSON Schema):\n${JSON.stringify(spec.parameters, null, 2)}`
      }))
    };
  }
}
