import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { ProviderErrorCode } from "./ProviderErrorCode.js";

export type ProviderStreamChunk =
  | { type: "text_delta"; text: string }
  | {
      type: "tool_call_delta";
      index: number;
      id?: string;
      name?: string;
      arguments_delta: string;
    }
  | { type: "finish"; reason: string | null }
  | { type: "error"; code: ProviderErrorCode; message: string; retryable: boolean };

export interface AssembledProviderToolCall {
  id: string;
  name: string;
  arguments: string;
  args: JsonObject;
}
