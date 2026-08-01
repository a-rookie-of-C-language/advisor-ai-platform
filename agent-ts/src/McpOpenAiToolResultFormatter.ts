import type { McpCallToolResult } from "./McpCallToolResult.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";

export class McpOpenAiToolResultFormatter {
  format(result: McpCallToolResult): OpenAiToolExecutionResult {
    const text = result.content.map((item) => item.text).filter(Boolean).join("\n");
    return {
      output: text || JSON.stringify(result),
      success: !result.isError
    };
  }
}
