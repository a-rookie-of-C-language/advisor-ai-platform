import type { JsonObject } from "../../../common/json/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../../../openai/tools/runtime/model/OpenAiToolExecutionResult.js";
import type { MemoryItem } from "../../model/entity/MemoryItem.js";

export class MemoryToolResultFormatter {
  formatRead(items: MemoryItem[]): OpenAiToolExecutionResult {
    return {
      output: JSON.stringify({
        ok: items.length > 0,
        status: items.length > 0 ? "hit" : "miss",
        message: items.length > 0 ? "hit" : "miss",
        items: items.map((item) => ({
          id: item.id,
          content: item.content,
          confidence: item.confidence,
          score: item.score,
          tags: item.tags || {}
        }))
      }),
      success: true
    };
  }

  formatWrite(result: JsonObject): OpenAiToolExecutionResult {
    return {
      output: JSON.stringify({
        ok: true,
        status: "ok",
        message: typeof result.message === "string" ? result.message : "memory_write_done",
        items: [],
        meta: {
          accepted: typeof result.accepted === "number" ? result.accepted : 0,
          rejected: typeof result.rejected === "number" ? result.rejected : 0
        }
      }),
      success: true
    };
  }
}
