import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";

export interface OpenAIChatTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonObject;
  };
  meta?: {
    category?: string;
    deferLoading?: boolean;
    searchHint?: string;
    concurrencySafe?: boolean;
    readOnly?: boolean;
  };
}
