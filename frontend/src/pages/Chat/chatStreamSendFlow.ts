import { chatApi, type ChatStreamMessageDTO } from '../../api/chatApi'
import type { WorkspaceFileDTO } from '../../api/workspaceApi'
import { globalMessage } from '../../utils/globalMessage'
import type { ChatEvent, ChatMessage, ToolCall } from './chatMessageModel'
import { applyFallbackChatResponse } from './chatFallbackSender'
import { createChatStreamMessageHandlers } from './chatStreamMessageHandlers'

interface SendChatStreamWithFallbackOptions {
  sessionId: number
  aiMsgId: number
  text: string
  historyMessages: ChatStreamMessageDTO[]
  attachments: WorkspaceFileDTO[]
  appendAssistantContent: (sessionId: number, messageId: number, chunk: string) => void
  updateAssistantMessage: (sessionId: number, messageId: number, patch: Partial<ChatMessage>) => void
  upsertToolCall: (sessionId: number, messageId: number, patch: ToolCall) => void
  appendMessageEvent: (sessionId: number, messageId: number, event: ChatEvent) => void
  recoverInvalidSession: (error: unknown) => Promise<boolean>
}

const STREAM_WARNING_MESSAGE = '流式响应异常，正在尝试降级重试'
const DEFAULT_FAILURE_CONTENT = '请求失败，请稍后重试。'

export async function sendChatStreamWithFallback({
  sessionId,
  aiMsgId,
  text,
  historyMessages,
  attachments,
  appendAssistantContent,
  updateAssistantMessage,
  upsertToolCall,
  appendMessageEvent,
  recoverInvalidSession,
}: SendChatStreamWithFallbackOptions): Promise<void> {
  try {
    const streamState = { failed: false, error: '' }

    await chatApi.streamChat(
      {
        messages: historyMessages,
        sessionId,
        attachments: attachments.map((file) => file.id),
      },
      createChatStreamMessageHandlers({
        sessionId,
        aiMsgId,
        appendAssistantContent,
        updateAssistantMessage,
        upsertToolCall,
        appendMessageEvent,
        onStreamError: (message) => {
          streamState.failed = true
          streamState.error = message ?? 'stream error'
        },
      }),
    )

    if (streamState.failed) {
      globalMessage.warning(STREAM_WARNING_MESSAGE)
      const fallbackResult = await applyFallbackChatResponse({
        sessionId,
        aiMsgId,
        text,
        defaultContent: streamState.error || DEFAULT_FAILURE_CONTENT,
        rethrowOnFailure: true,
        recoverInvalidSession,
        updateAssistantMessage,
      })
      if (fallbackResult === 'invalid-session') {
        return
      }
    }
  } catch {
    globalMessage.warning(STREAM_WARNING_MESSAGE)
    await applyFallbackChatResponse({
      sessionId,
      aiMsgId,
      text,
      defaultContent: DEFAULT_FAILURE_CONTENT,
      rethrowOnFailure: false,
      recoverInvalidSession,
      updateAssistantMessage,
    })
  }
}
