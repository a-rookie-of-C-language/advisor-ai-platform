import type { EngineContext } from "./EngineContext.js";
import type { EngineEvent } from "./EngineEvent.js";

export interface EngineStrategy {
  run(context: EngineContext): AsyncIterable<EngineEvent>;
}
