import type { JsonObject } from "../../common/json/JsonTypes.js";
import { JsonObjectReader } from "../../common/json/JsonObjectReader.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";

export class McpToolDescriptorMapper {
  private readonly jsonObjectReader = new JsonObjectReader();

  mapTools(result: JsonObject, serverName: string): McpToolDescriptor[] {
    const tools = Array.isArray(result.tools) ? result.tools : [];
    return tools
      .filter((tool): tool is JsonObject => this.jsonObjectReader.isJsonObject(tool))
      .map((tool) => ({
        name: String(tool.name || ""),
        description: String(tool.description || ""),
        inputSchema: this.jsonObjectReader.asObject(tool.inputSchema),
        server: serverName
      }))
      .filter((tool) => tool.name);
  }
}
