import type { OpenAIChatMessage } from "../../openai/chat/model/message/OpenAIChatMessage.js";
import type { OpenAIChatTool } from "../../openai/chat/model/tool/OpenAIChatTool.js";

export interface AgentCoreStreamChatRequest {
  url: string;
  apiKey: string;
  model: string;
  temperature: number;
  requestTimeoutMs: number;
  messages: OpenAIChatMessage[];
  tools?: OpenAIChatTool[];
}
