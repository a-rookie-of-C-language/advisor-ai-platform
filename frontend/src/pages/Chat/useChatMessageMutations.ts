import type { Dispatch, SetStateAction } from 'react'
import type { ChatEvent, ChatMessage, ChatSession, ToolCall } from './chatMessageModel'
import {
  appendEventInSessions,
  appendMessageContentInSessions,
  patchMessageInSessions,
  upsertToolCallInSessions,
} from './chatSessionState'

export function useChatMessageMutations(setSessions: Dispatch<SetStateAction<ChatSession[]>>) {
  const updateAssistantMessage = (sessionId: number, messageId: number, patch: Partial<ChatMessage>) => {
    setSessions((prev) => patchMessageInSessions(prev, sessionId, messageId, patch))
  }

  const upsertToolCall = (sessionId: number, messageId: number, patch: ToolCall) => {
    setSessions((prev) => upsertToolCallInSessions(prev, sessionId, messageId, patch))
  }

  const appendMessageEvent = (sessionId: number, messageId: number, event: ChatEvent) => {
    setSessions((prev) => appendEventInSessions(prev, sessionId, messageId, event))
  }

  const appendAssistantContent = (sessionId: number, messageId: number, chunk: string) => {
    setSessions((prev) => appendMessageContentInSessions(prev, sessionId, messageId, chunk))
  }

  return {
    updateAssistantMessage,
    upsertToolCall,
    appendMessageEvent,
    appendAssistantContent,
  }
}
