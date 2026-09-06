import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";

export interface OpenAIChatJsonSchema {
  name: string;
  strict?: boolean;
  schema: JsonObject;
}
