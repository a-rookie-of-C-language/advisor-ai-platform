import type { JsonObject } from "../common/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../openai/OpenAiToolExecutionResult.js";

export class WorkspaceOpenAiToolResultFactory {
  createSuccess(output: JsonObject): OpenAiToolExecutionResult {
    return {
      output: JSON.stringify({ ok: true, status: "ok", ...output }),
      success: true
    };
  }
}
