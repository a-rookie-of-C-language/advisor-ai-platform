import type { ChatMessageDTO } from "../../common/model/ChatMessageDTO.js";

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
  readonly taskPlan?: unknown;
  readonly assistantAnswer?: string;
  readonly streamFailed?: boolean;
  readonly debugDeltaCount?: number;
  readonly debugPreview?: string;
  readonly llmChunkCount?: number;
  readonly activeSkills?: readonly string[];
  readonly skillSystemPrompt?: string;
}
