import type { JsonObject } from "../../common/json/types/JsonObject.js";
import type { OpenAIChatTool } from "../../openai/chat/model/tool/OpenAIChatTool.js";

export interface TaskPlanStep {
  readonly action: "call_tool" | "final";
  readonly toolName?: string;
  readonly arguments?: JsonObject;
  readonly reason: string;
  readonly expectedOutcome?: string;
  readonly sufficient: boolean;
}

export interface TaskPlan {
  readonly mode: "direct" | "plan_and_execute";
  readonly goal: string;
  readonly summary: string;
  readonly stopWhen: string;
  readonly sufficient: boolean;
  readonly requiredTools: readonly string[];
  readonly steps: readonly TaskPlanStep[];
  readonly routeContext: JsonObject;
  readonly source: "fallback";
}

export interface TaskPlanInput {
  readonly userQuery: string;
  readonly availableTools: readonly OpenAIChatTool[];
  readonly routeContext: JsonObject;
}
