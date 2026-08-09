import type { JsonObject } from "../../common/json/types/JsonObject.js";

export type AgentCoreStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "tool_call";
      tool_call_id: string;
      tool_name: string;
      tool_args: JsonObject;
    }
  | {
      type: "done";
      finish_reason: string | null;
    };
