import type { AgentConfig } from "./AgentConfig.js";
import type { OpenAIChatCompletionRequest } from "./OpenAIChatCompletionRequest.js";
import type { OpenAIChatMessage } from "./OpenAIChatMessage.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";

export class OpenAIChatCompletionRequestBuilder {
  constructor(private readonly config: AgentConfig) {}

  build(messages: OpenAIChatMessage[], tools: OpenAIChatTool[], signal: AbortSignal): OpenAIChatCompletionRequest {
    return {
      url: `${this.config.openAiBaseUrl}/chat/completions`,
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.openAiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.config.openAiModel,
          messages,
          temperature: this.config.openAiTemperature,
          stream: true,
          ...(tools.length > 0 ? { tools, tool_choice: "auto" } : {})
        }),
        signal
      }
    };
  }
}
