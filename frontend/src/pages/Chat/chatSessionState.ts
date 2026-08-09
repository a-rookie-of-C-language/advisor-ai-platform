import type { ChatEvent, ChatMessage, ChatSession, ToolCall } from './chatTypes'

export function patchMessageInSessions(
  sessions: ChatSession[],
  sessionId: number,
  messageId: number,
  patch: Partial<ChatMessage>,
): ChatSession[] {
  return sessions.map((session) => {
    if (session.id !== sessionId) {
      return session
    }
    return {
      ...session,
      messages: session.messages.map((msg) => (msg.id === messageId ? { ...msg, ...patch } : msg)),
    }
  })
}

export function upsertToolCallInSessions(
  sessions: ChatSession[],
  sessionId: number,
  messageId: number,
  patch: ToolCall,
): ChatSession[] {
  return sessions.map((session) => {
    if (session.id !== sessionId) {
      return session
    }
    return {
      ...session,
      messages: session.messages.map((msg) => {
        if (msg.id !== messageId) {
          return msg
        }
        const calls = msg.toolCalls ?? []
        const index = calls.findIndex((item) => item.id === patch.id)
        const nextCalls = index >= 0
          ? calls.map((item) => (item.id === patch.id ? { ...item, ...patch } : item))
          : [...calls, patch]
        return { ...msg, toolCalls: nextCalls }
      }),
    }
  })
}

export function appendEventInSessions(
  sessions: ChatSession[],
  sessionId: number,
  messageId: number,
  event: ChatEvent,
): ChatSession[] {
  return sessions.map((session) => {
    if (session.id !== sessionId) {
      return session
    }
    return {
      ...session,
      messages: session.messages.map((msg) => {
        if (msg.id !== messageId) {
          return msg
        }
        const events = msg.events ?? []
        return {
          ...msg,
          events: events.some((item) => item.id === event.id) ? events : [...events, event],
        }
      }),
    }
  })
}

export function appendMessageContentInSessions(
  sessions: ChatSession[],
  sessionId: number,
  messageId: number,
  chunk: string,
): ChatSession[] {
  return sessions.map((session) => {
    if (session.id !== sessionId) {
      return session
    }
    return {
      ...session,
      messages: session.messages.map((msg) => (
        msg.id === messageId
          ? { ...msg, content: `${msg.content}${chunk}`, streaming: true, progressText: undefined }
          : msg
      )),
    }
  })
}

export function replaceSessionMessages(
  sessions: ChatSession[],
  sessionId: number,
  messages: ChatMessage[],
): ChatSession[] {
  return sessions.map((session) => (
    session.id === sessionId
      ? { ...session, messages }
      : session
  ))
}
