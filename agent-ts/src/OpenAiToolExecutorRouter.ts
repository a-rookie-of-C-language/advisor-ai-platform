import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import type { MemoryOpenAiToolBridge } from "./MemoryOpenAiToolBridge.js";
import type { McpOpenAiToolBridge } from "./McpOpenAiToolBridge.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import { OpenAiToolResultFactory } from "./OpenAiToolResultFactory.js";
import type { RagOpenAiToolBridge } from "./RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "./WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "./WorkspaceOpenAiToolBridge.js";

export class OpenAiToolExecutorRouter {
  constructor(
    private readonly workspaceOpenAiToolBridge?: WorkspaceOpenAiToolBridge,
    private readonly webOpenAiToolBridge?: WebOpenAiToolBridge,
    private readonly ragOpenAiToolBridge?: RagOpenAiToolBridge,
    private readonly memoryOpenAiToolBridge?: MemoryOpenAiToolBridge,
    private readonly mcpOpenAiToolBridge?: McpOpenAiToolBridge
  ) {}

  async executeTool(
    chatRequest: ChatStreamRequest,
    toolName: string,
    toolArgs: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    if (this.workspaceOpenAiToolBridge?.canExecute(toolName)) {
      return this.workspaceOpenAiToolBridge.executeTool(chatRequest, toolName, toolArgs);
    }
    if (this.webOpenAiToolBridge?.canExecute(toolName)) {
      return this.webOpenAiToolBridge.executeTool(toolName, toolArgs);
    }
    if (this.ragOpenAiToolBridge?.canExecute(toolName)) {
      return this.ragOpenAiToolBridge.executeTool(chatRequest, toolArgs);
    }
    if (this.memoryOpenAiToolBridge?.canExecute(toolName)) {
      return this.memoryOpenAiToolBridge.executeTool(chatRequest, toolName, toolArgs);
    }
    if (this.mcpOpenAiToolBridge) {
      return this.mcpOpenAiToolBridge.executeTool(toolName, toolArgs);
    }
    return OpenAiToolResultFactory.error(`未知工具: ${toolName}`);
  }
}
