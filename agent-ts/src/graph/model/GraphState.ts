import type { ChatMessageDTO } from "../../common/model/ChatMessageDTO.js";

export interface GraphState {
  readonly messages: readonly ChatMessageDTO[];
  readonly modelMessages?: readonly ChatMessageDTO[];
  readonly userQuery?: string;
  readonly routeCategories?: readonly string[];
  readonly matchedTools?: readonly string[];
  readonly taskPlan?: unknown;
  readonly assistantAnswer?: string;
  readonly streamFailed?: boolean;
}
