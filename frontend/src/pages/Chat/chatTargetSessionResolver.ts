import type { Dispatch, SetStateAction } from 'react'
import { chatApi } from '../../api/chatApi'
import { globalMessage } from '../../utils/globalMessage'
import { type ChatSession, toChatSession } from './chatMessageModel'

interface ResolveChatTargetSessionOptions {
  activeSession: ChatSession | null
  setSessions: Dispatch<SetStateAction<ChatSession[]>>
  setActiveId: Dispatch<SetStateAction<number | null>>
  applyRouteSessionId: (sessionId: number | null) => void
  recoverInvalidSession: (error: unknown) => Promise<boolean>
}

const CREATE_SESSION_FAILED_MESSAGE = '创建会话失败，无法发送消息'

export async function resolveChatTargetSession({
  activeSession,
  setSessions,
  setActiveId,
  applyRouteSessionId,
  recoverInvalidSession,
}: ResolveChatTargetSessionOptions): Promise<ChatSession | null> {
  if (activeSession) {
    return activeSession
  }

  try {
    const response = await chatApi.createSession()
    const created = response.data
    if (!created?.id) {
      globalMessage.error(CREATE_SESSION_FAILED_MESSAGE)
      return null
    }
    const targetSession = toChatSession(created)
    setSessions((prev) => [targetSession, ...prev])
    setActiveId(targetSession.id)
    applyRouteSessionId(targetSession.id)
    return targetSession
  } catch (error) {
    if (await recoverInvalidSession(error)) {
      return null
    }
    globalMessage.error(typeof error === 'string' ? error : CREATE_SESSION_FAILED_MESSAGE)
    return null
  }
}
