import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../../../../openai/tools/runtime/model/OpenAiToolExecutionResult.js";

export class WorkspaceOpenAiToolResultFactory {
  createSuccess(output: JsonObject): OpenAiToolExecutionResult {
    return {
      output: JSON.stringify({ ok: true, status: "ok", ...output }),
      success: true
    };
  }
}
