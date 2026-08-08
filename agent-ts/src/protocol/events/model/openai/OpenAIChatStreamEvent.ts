import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";

export type OpenAIChatStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "tool_call";
      toolCallId: string;
      toolName: string;
      toolArgs: JsonObject;
    }
  | {
      type: "tool_result";
      toolCallId: string;
      toolName: string;
      toolOutput: string;
      success: boolean;
    };
