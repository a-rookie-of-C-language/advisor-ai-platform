import { JsonObjectReader } from "../../../../common/json/JsonObjectReader.js";
import type { JsonObject } from "../../../../common/json/JsonTypes.js";
import type { McpCallToolResult } from "../../model/result/McpCallToolResult.js";

export class McpCallToolResultMapper {
  private readonly jsonObjectReader = new JsonObjectReader();

  mapResult(result: JsonObject): McpCallToolResult {
    const content = Array.isArray(result.content) ? result.content : [];
    return {
      content: content
        .filter((item): item is JsonObject => this.jsonObjectReader.isJsonObject(item))
        .map((item) => ({ type: String(item.type || "text"), text: String(item.text || ""), data: item.data })),
      isError: result.isError === true
    };
  }
}
