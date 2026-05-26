import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { chatApi } from '../../api/chatApi'
import { globalMessage } from '../../utils/globalMessage'
import type { ChatSession } from './chatTypes'
import { toChatMessage } from './chatMessageModel'
import { replaceSessionMessages } from './chatSessionState'

interface UseChatMessagesLoaderOptions {
  activeId: number | null | undefined
  setMessagesLoading: Dispatch<SetStateAction<boolean>>
  setSessions: Dispatch<SetStateAction<ChatSession[]>>
  recoverInvalidSession: (error: unknown) => Promise<boolean>
}

export function useChatMessagesLoader({
  activeId,
  setMessagesLoading,
  setSessions,
  recoverInvalidSession,
}: UseChatMessagesLoaderOptions) {
  const messageLoadSeqRef = useRef(0)

  useEffect(() => {
    if (activeId == null) {
      setMessagesLoading(false)
      return
    }

    setMessagesLoading(true)
    const currentSeq = ++messageLoadSeqRef.current
    void (async () => {
      try {
        const response = await chatApi.listMessages(activeId)
        if (currentSeq !== messageLoadSeqRef.current) {
          return
        }
        const messages = (response.data ?? []).map(toChatMessage)
        setSessions((prev) => replaceSessionMessages(prev, activeId, messages))
      } catch (error) {
        if (currentSeq !== messageLoadSeqRef.current) {
          return
        }
        if (await recoverInvalidSession(error)) {
          return
        }
        globalMessage.error(typeof error === 'string' ? error : '鍔犺浇娑堟伅澶辫触')
      } finally {
        if (currentSeq === messageLoadSeqRef.current) {
          setMessagesLoading(false)
        }
      }
    })()
  }, [activeId, recoverInvalidSession, setMessagesLoading, setSessions])
}
