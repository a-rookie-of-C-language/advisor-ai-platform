import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useSearchParams } from 'react-router-dom'
import { chatApi } from '../../api/chatApi'
import { globalMessage } from '../../utils/globalMessage'
import {
  type ChatSession,
  isSessionNotFoundError,
  toChatSession,
} from './chatMessageModel'
import { emitChatSessionsRefresh, onChatSessionsRefresh } from './chatSessionEvents'
import { mergeSessionsWithExistingMessages, resolveNextActiveSessionId } from './chatSessionSelection'
import { useChatRouteSessionEffect } from './useChatRouteSessionEffect'

interface UseChatSessionsOptions {
  shouldAutoScrollRef: MutableRefObject<boolean>
}

export function useChatSessions({ shouldAutoScrollRef }: UseChatSessionsOptions) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const routeSyncRef = useRef(false)

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) ?? null,
    [sessions, activeId],
  )

  const applyRouteSessionId = useCallback((sessionId: number | null) => {
    routeSyncRef.current = true
    if (sessionId == null) {
      setSearchParams({}, { replace: true })
      return
    }
    setSearchParams({ sessionId: String(sessionId) }, { replace: true })
  }, [setSearchParams])

  const reloadSessions = useCallback(async (
    preferredSessionId?: number,
    syncRoute = false,
  ): Promise<ChatSession[]> => {
    const response = await chatApi.listSessions()
    const baseSessions: ChatSession[] = (response.data ?? []).map(toChatSession)
    let nextSessions: ChatSession[] = baseSessions
    setSessions((prev) => {
      nextSessions = mergeSessionsWithExistingMessages(baseSessions, prev)
      return nextSessions
    })
    if (nextSessions.length === 0) {
      setActiveId(null)
      if (syncRoute) {
        applyRouteSessionId(null)
      }
      return nextSessions
    }
    const nextActiveId = resolveNextActiveSessionId(
      nextSessions,
      preferredSessionId,
      searchParams.get('sessionId'),
    )
    setActiveId(nextActiveId)
    if (syncRoute) {
      applyRouteSessionId(nextActiveId)
    }
    return nextSessions
  }, [applyRouteSessionId, searchParams])

  const recoverInvalidSession = useCallback(async (error: unknown): Promise<boolean> => {
    if (!isSessionNotFoundError(error)) {
      return false
    }
    await reloadSessions(undefined, true)
    emitChatSessionsRefresh()
    globalMessage.error('会话不存在，已自动刷新会话列表')
    return true
  }, [reloadSessions])

  useEffect(() => {
    void (async () => {
      try {
        await reloadSessions()
      } catch (error) {
        globalMessage.error(typeof error === 'string' ? error : '加载会话失败')
      }
    })()
  }, [reloadSessions])

  useEffect(() => {
    const unsubscribe = onChatSessionsRefresh(() => {
      void reloadSessions(activeId ?? undefined)
    })
    return unsubscribe
  }, [activeId, reloadSessions])

  useChatRouteSessionEffect({
    searchParams,
    sessions,
    activeId,
    setActiveId,
    shouldAutoScrollRef,
    routeSyncRef,
    reloadSessions,
  })

  return {
    setSessions,
    activeId,
    setActiveId,
    activeSession,
    applyRouteSessionId,
    reloadSessions,
    recoverInvalidSession,
  }
}
