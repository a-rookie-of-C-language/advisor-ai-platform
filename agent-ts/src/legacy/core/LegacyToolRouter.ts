import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { AgentLoop } from "../../app/loop/core/AgentLoop.js";
import type { TaskPlan } from "../../planning/model/TaskPlan.js";
import type { LegacyToolRouteContext } from "../model/LegacyToolRouteContext.js";

export class LegacyToolRouter {
  route(
    routeCategories: readonly string[],
    matchedTools: readonly string[],
    taskPlan: TaskPlan | undefined
  ): LegacyToolRouteContext {
    return {
      matchedTools,
      routeCategories,
      taskPlan: (taskPlan ?? {}) as JsonObject,
      events: []
    };
  }

  isDirectPlan(taskPlan: TaskPlan | undefined): boolean {
    return taskPlan?.mode === "direct";
  }

  decorateLoop(_loop: AgentLoop): AgentLoop {
    return _loop;
  }
}
