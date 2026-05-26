import type { ChatSession } from './chatMessageModel'

export function mergeSessionsWithExistingMessages(
  baseSessions: ChatSession[],
  previousSessions: ChatSession[],
): ChatSession[] {
  const messageMap = new Map(previousSessions.map((session) => [session.id, session.messages]))
  return baseSessions.map((session) => ({
    ...session,
    messages: messageMap.get(session.id) ?? [],
  }))
}

export function resolveNextActiveSessionId(
  sessions: ChatSession[],
  preferredSessionId: number | undefined,
  routeSessionId: string | null,
): number {
  const targetId = preferredSessionId ?? Number(routeSessionId ?? '')
  const matched =
    Number.isFinite(targetId) && targetId > 0
      ? sessions.find((item) => item.id === targetId)
      : null
  return matched ? matched.id : sessions[0].id
}
