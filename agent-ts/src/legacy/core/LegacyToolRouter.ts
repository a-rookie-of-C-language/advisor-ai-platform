import type { AgentLoop } from "../../app/loop/core/AgentLoop.js";
import { buildLegacyRouteContext } from "./LegacyRouteSupport.js";
import type { TaskPlan } from "../../planning/model/TaskPlan.js";
import type { LegacyToolRouteContext } from "../model/LegacyToolRouteContext.js";
import type { IntentRouteDecision } from "../../routing/model/IntentRouteDecision.js";

export class LegacyToolRouter {
  route(routeDecision: IntentRouteDecision, matchedTools: readonly string[], educationDomain: boolean): LegacyToolRouteContext {
    return buildLegacyRouteContext(routeDecision, matchedTools, educationDomain);
  }

  isDirectPlan(taskPlan: TaskPlan | undefined): boolean {
    return taskPlan?.mode === "direct";
  }

  decorateLoop(_loop: AgentLoop): AgentLoop {
    return _loop;
  }
}
