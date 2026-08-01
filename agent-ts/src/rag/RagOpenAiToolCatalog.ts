import type { OpenAIChatTool } from "../openai/OpenAIChatTool.js";

export class RagOpenAiToolCatalog {
  listTools(): OpenAIChatTool[] {
    return [
      {
        type: "function",
        function: {
          name: "rag_search",
          description: "检索当前会话选择的知识库文档清单，用于判断哪些资料可能与问题相关。",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "检索关键词或用户问题" },
              top_k: { type: "integer", description: "返回文档数量，默认 5，最大 10" }
            }
          }
        }
      }
    ];
  }

  toolNames(): Set<string> {
    return new Set(this.listTools().map((tool) => tool.function.name));
  }
}
