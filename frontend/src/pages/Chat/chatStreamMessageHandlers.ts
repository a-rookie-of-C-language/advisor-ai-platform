import type { StreamHandlers } from '../../api/chatApi'
import {
  type ChatEvent,
  type ChatMessage,
  type ToolCall,
  describeSystemState,
  streamEventRecord,
  toDisplaySources,
} from './chatMessageModel'

interface ChatStreamMessageHandlersOptions {
  sessionId: number
  aiMsgId: number
  appendAssistantContent: (sessionId: number, messageId: number, chunk: string) => void
  updateAssistantMessage: (sessionId: number, messageId: number, patch: Partial<ChatMessage>) => void
  upsertToolCall: (sessionId: number, messageId: number, patch: ToolCall) => void
  appendMessageEvent: (sessionId: number, messageId: number, event: ChatEvent) => void
  onStreamError: (message?: string) => void
}

export function createChatStreamMessageHandlers({
  sessionId,
  aiMsgId,
  appendAssistantContent,
  updateAssistantMessage,
  upsertToolCall,
  appendMessageEvent,
  onStreamError,
}: ChatStreamMessageHandlersOptions): StreamHandlers {
  return {
    onEvent: ({ event, payload }) => {
      const record = streamEventRecord(event, payload)
      if (record) {
        appendMessageEvent(sessionId, aiMsgId, record)
      }
    },
    onDelta: (chunk) => {
      appendAssistantContent(sessionId, aiMsgId, chunk)
    },
    onReasoningDelta: () => {
      updateAssistantMessage(sessionId, aiMsgId, {
        progressText: '模型正在整理思路...',
      })
    },
    onProgress: (message, elapsedSec) => {
      updateAssistantMessage(sessionId, aiMsgId, {
        progressText: message + (typeof elapsedSec === 'number' ? ' (' + elapsedSec + 's)' : ''),
      })
    },
    onSystemEvent: ({ event, payload }) => {
      updateAssistantMessage(sessionId, aiMsgId, {
        progressText: describeSystemState(event, payload),
      })
    },
    onEnd: () => {
      updateAssistantMessage(sessionId, aiMsgId, { streaming: false })
    },
    onToolUse: (data) => {
      upsertToolCall(sessionId, aiMsgId, {
        id: data.toolCallId || data.toolName,
        toolName: data.toolName,
        input: data.input,
      })
      updateAssistantMessage(sessionId, aiMsgId, {
        progressText: data.toolName ? '正在调用工具：' + data.toolName : '正在调用工具',
      })
    },
    onToolResult: (data) => {
      upsertToolCall(sessionId, aiMsgId, {
        id: data.toolCallId || data.toolName,
        toolName: data.toolName,
        status: data.result.status,
        message: data.result.message,
        result: data.result,
      })
      updateAssistantMessage(sessionId, aiMsgId, {
        progressText: data.toolName ? '工具已返回：' + data.toolName : '工具已返回',
      })
    },
    onSources: (items, _status, message) => {
      updateAssistantMessage(sessionId, aiMsgId, {
        sources: toDisplaySources(items, message),
      })
    },
    onToolError: (data) => {
      upsertToolCall(sessionId, aiMsgId, {
        id: data.toolCallId || data.toolName,
        toolName: data.toolName,
        status: 'error',
        message: data.message,
      })
      updateAssistantMessage(sessionId, aiMsgId, {
        progressText: data.toolName ? '工具调用失败：' + data.toolName : '工具调用失败',
      })
    },
    onError: (message) => {
      onStreamError(message)
    },
    onRiskAlert: (alertData) => {
      updateAssistantMessage(sessionId, aiMsgId, {
        streaming: false,
        content: alertData.message || '该内容因不合规已被过滤',
      })
    },
  }
}
