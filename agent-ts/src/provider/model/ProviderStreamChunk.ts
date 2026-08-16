import type { JsonObject } from "../../common/json/types/JsonTypes.js";

export type ProviderStreamChunk =
  | { type: "text_delta"; text: string }
  | {
      type: "tool_call_delta";
      index: number;
      id?: string;
      name?: string;
      arguments_delta: string;
    }
  | { type: "finish"; reason: string | null };

export interface AssembledProviderToolCall {
  id: string;
  name: string;
  arguments: string;
  args: JsonObject;
}
