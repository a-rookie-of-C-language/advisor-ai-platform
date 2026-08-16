import type { OpenAiToolExecutionResult } from "../../../openai/tools/runtime/model/result/OpenAiToolExecutionResult.js";

export class ToolTimeoutPolicy {
  async execute(
    timeoutMs: number | undefined,
    signal: AbortSignal | undefined,
    execute: (signal?: AbortSignal) => Promise<OpenAiToolExecutionResult>
  ): Promise<OpenAiToolExecutionResult> {
    if (timeoutMs === undefined) {
      return execute(signal);
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error("工具 timeoutMs 必须是正数");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("TOOL_TIMEOUT"), timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    try {
      const result = await execute(combinedSignal);
      if (controller.signal.aborted) {
        return {
          output: JSON.stringify({
            ok: false,
            code: "TOOL_TIMEOUT",
            message: `工具调用超过 ${timeoutMs}ms`,
          }),
          success: false,
        };
      }
      return result;
    } catch (error) {
      if (controller.signal.aborted && !signal?.aborted) {
        return {
          output: JSON.stringify({
            ok: false,
            code: "TOOL_TIMEOUT",
            message: `工具调用超过 ${timeoutMs}ms`,
          }),
          success: false,
        };
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
