import type { OpenAiToolExecutionResult } from "../model/OpenAiToolExecutionResult.js";

export class OpenAiToolResultFactory {
  static error(message: string): OpenAiToolExecutionResult {
    return {
      output: JSON.stringify({ ok: false, status: "error", message, items: [] }),
      success: false
    };
  }

  static errorFromUnknown(error: unknown, fallbackMessage: string): OpenAiToolExecutionResult {
    return this.error(error instanceof Error ? error.message : fallbackMessage);
  }
}
