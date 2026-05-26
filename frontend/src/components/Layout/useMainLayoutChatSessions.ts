import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { chatApi, type ChatSessionDTO } from '../../api/chatApi'
import { onChatSessionsRefresh } from '../../pages/Chat/chatSessionEvents'
import { globalMessage } from '../../utils/globalMessage'

export function useMainLayoutChatSessions(
  pathname: string,
  search: string,
  navigate: NavigateFunction,
) {
  const [chatSessions, setChatSessions] = useState<ChatSessionDTO[]>([])
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadSeqRef = useRef(0)
  const isChatPage = pathname === '/chat'
  const activeSessionId = useMemo(() => {
    const value = new URLSearchParams(search).get('sessionId')
    if (!value) {
      return null
    }
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }, [search])

  const loadChatSessions = useCallback(async () => {
    if (!isChatPage) {
      return
    }
    const currentSeq = ++loadSeqRef.current
    try {
      const response = await chatApi.listSessions()
      if (currentSeq !== loadSeqRef.current) {
        return
      }
      setChatSessions(response.data ?? [])
    } catch {
      if (currentSeq !== loadSeqRef.current) {
        return
      }
      setChatSessions([])
    }
  }, [isChatPage])

  useEffect(() => {
    void loadChatSessions()
  }, [loadChatSessions])

  useEffect(() => {
    const unsubscribe = onChatSessionsRefresh(() => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null
        void loadChatSessions()
      }, 80)
    })
    return () => {
      unsubscribe()
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [loadChatSessions])

  const createSession = useCallback(() => {
    void (async () => {
      try {
        const created = (await chatApi.createSession()).data
        if (!created?.id) {
          globalMessage.error('创建会话失败')
          return
        }
        navigate(`/chat?sessionId=${created.id}`)
        await loadChatSessions()
      } catch (error) {
        globalMessage.error(typeof error === 'string' ? error : '创建会话失败')
      }
    })()
  }, [loadChatSessions, navigate])

  const selectSession = useCallback(
    (sessionId: number) => {
      navigate(`/chat?sessionId=${sessionId}`)
    },
    [navigate],
  )

  const deleteSession = useCallback(
    (sessionId: number) => {
      void (async () => {
        await chatApi.deleteSession(sessionId)
        const next = chatSessions.filter((session) => session.id !== sessionId)
        setChatSessions(next)
        if (activeSessionId === sessionId) {
          navigate(next.length > 0 ? `/chat?sessionId=${next[0].id}` : '/chat')
        }
      })()
    },
    [activeSessionId, chatSessions, navigate],
  )

  return {
    isChatPage,
    chatSessions,
    activeSessionId,
    createSession,
    selectSession,
    deleteSession,
  }
}
