import type { JsonObject } from "../../common/json/types/JsonObject.js";
import type { ProviderStreamChunk } from "../../provider/model/ProviderStreamChunk.js";

export type AgentCoreStreamEvent = ProviderStreamChunk
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
