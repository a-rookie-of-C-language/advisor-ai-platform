import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { ChatSession } from './chatMessageModel'

interface UseChatRouteSessionEffectOptions {
  searchParams: URLSearchParams
  sessions: ChatSession[]
  activeId: number | null
  setActiveId: Dispatch<SetStateAction<number | null>>
  shouldAutoScrollRef: MutableRefObject<boolean>
  routeSyncRef: MutableRefObject<boolean>
  reloadSessions: (preferredSessionId?: number, syncRoute?: boolean) => Promise<ChatSession[]>
}

export function useChatRouteSessionEffect({
  searchParams,
  sessions,
  activeId,
  setActiveId,
  shouldAutoScrollRef,
  routeSyncRef,
  reloadSessions,
}: UseChatRouteSessionEffectOptions) {
  useEffect(() => {
    const routeSessionId = Number(searchParams.get('sessionId') ?? '')
    if (routeSyncRef.current) {
      routeSyncRef.current = false
      return
    }
    if (!Number.isFinite(routeSessionId) || routeSessionId <= 0) {
      if (sessions.length > 0 && activeId !== sessions[0].id) {
        shouldAutoScrollRef.current = true
        setActiveId(sessions[0].id)
      }
      return
    }

    const matched = sessions.find((session) => session.id === routeSessionId)
    if (!matched) {
      void reloadSessions(routeSessionId, true)
      return
    }

    if (routeSessionId !== activeId) {
      shouldAutoScrollRef.current = true
      setActiveId(routeSessionId)
    }
  }, [searchParams, activeId, sessions, setActiveId, shouldAutoScrollRef, routeSyncRef, reloadSessions])
}
