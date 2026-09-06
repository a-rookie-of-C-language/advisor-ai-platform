import type { ChatMessageDTO } from "../../common/model/ChatMessageDTO.js";
import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { TaskPlan } from "../../planning/model/TaskPlan.js";

export interface GraphExplorationState {
  readonly summary: string;
  readonly reason: "route_match" | "text_match" | "none";
  readonly matchedTools: readonly string[];
  readonly sufficient?: boolean;
  readonly evidence: readonly { readonly tool_name: string; readonly status: string; readonly message: string; readonly items: readonly unknown[] }[];
  readonly toolCalls: readonly { readonly tool_name: string; readonly arguments: Record<string, unknown>; readonly status: string; readonly message: string }[];
}

export interface GraphState {
  readonly messages: readonly ChatMessageDTO[];
  readonly modelMessages?: readonly ChatMessageDTO[];
  readonly userQuery?: string;
  readonly userId?: number | null;
  readonly sessionId?: number | null;
  readonly traceId?: string | null;
  readonly turnId?: string | null;
  readonly memoryEnabled?: boolean;
  readonly ragEnabled?: boolean;
  readonly forceRag?: boolean;
  readonly educationDomain?: boolean;
  readonly webSearchEnabled?: boolean;
  readonly useTool?: boolean;
  readonly routeCategories?: readonly string[];
  readonly matchedTools?: readonly string[];
  readonly routePayload?: JsonObject;
  readonly routeReasoning?: JsonObject;
  readonly planReasoning?: JsonObject;
  readonly taskPlan?: TaskPlan;
  readonly assistantAnswer?: string;
  readonly streamFailed?: boolean;
  readonly debugDeltaCount?: number;
  readonly debugPreview?: string;
  readonly llmChunkCount?: number;
  readonly skillSelectionPrompt?: string;
  readonly activeSkills?: readonly string[];
  readonly skillSystemPrompt?: string;
  readonly exploration?: GraphExplorationState;
  readonly forceFetchUrl?: string;
}
