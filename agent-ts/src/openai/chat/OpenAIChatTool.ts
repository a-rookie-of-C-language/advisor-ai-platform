import type { JsonObject } from "../../common/json/JsonTypes.js";

export interface OpenAIChatTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonObject;
  };
}
