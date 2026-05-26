import { chatApi } from '../../api/chatApi'
import {
  type ChatMessage,
  normalizeEventRecords,
  toolCallsFromEvents,
} from './chatMessageModel'

type FallbackSendResult = 'applied' | 'invalid-session' | 'failed'

interface ApplyFallbackChatResponseOptions {
  sessionId: number
  aiMsgId: number
  text: string
  defaultContent: string
  rethrowOnFailure: boolean
  recoverInvalidSession: (error: unknown) => Promise<boolean>
  updateAssistantMessage: (sessionId: number, messageId: number, patch: Partial<ChatMessage>) => void
}

export async function applyFallbackChatResponse({
  sessionId,
  aiMsgId,
  text,
  defaultContent,
  rethrowOnFailure,
  recoverInvalidSession,
  updateAssistantMessage,
}: ApplyFallbackChatResponseOptions): Promise<FallbackSendResult> {
  try {
    const fallbackResp = await chatApi.sendMessage(sessionId, text)
    const fallbackEvents = normalizeEventRecords(fallbackResp.data?.events)
    updateAssistantMessage(sessionId, aiMsgId, {
      streaming: false,
      content: fallbackResp.data?.content ?? defaultContent,
      events: fallbackEvents,
      toolCalls: toolCallsFromEvents(fallbackEvents),
    })
    return 'applied'
  } catch (fallbackError) {
    if (await recoverInvalidSession(fallbackError)) {
      updateAssistantMessage(sessionId, aiMsgId, {
        streaming: false,
        content: '会话不存在，已自动刷新，请重新发送消息。',
      })
      return 'invalid-session'
    }
    if (rethrowOnFailure) {
      throw fallbackError
    }
    updateAssistantMessage(sessionId, aiMsgId, {
      streaming: false,
      content: typeof fallbackError === 'string' ? '请求失败：' + fallbackError : '请求失败，请稍后重试。',
    })
    return 'failed'
  }
}
