import type { JsonObject } from "./JsonTypes.js";

export interface OpenAIChatTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonObject;
  };
}
