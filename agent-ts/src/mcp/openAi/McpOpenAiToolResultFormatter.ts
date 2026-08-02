import type { McpCallToolResult } from "../tools/McpCallToolResult.js";
import type { OpenAiToolExecutionResult } from "../../openai/OpenAiToolExecutionResult.js";

export class McpOpenAiToolResultFormatter {
  format(result: McpCallToolResult): OpenAiToolExecutionResult {
    const text = result.content.map((item) => item.text).filter(Boolean).join("\n");
    return {
      output: text || JSON.stringify(result),
      success: !result.isError
    };
  }
}
