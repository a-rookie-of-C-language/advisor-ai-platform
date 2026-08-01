import type { JsonObject } from "../common/JsonTypes.js";

export interface OpenAIChatTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonObject;
  };
}
