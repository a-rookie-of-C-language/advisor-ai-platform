import { useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { WorkspaceFileDTO } from '../../api/workspaceApi'
import type { ChatSession } from './chatMessageModel'
import {
  appendOptimisticMessages,
  buildHistoryMessages,
  createAssistantPlaceholder,
  createUserMessage,
} from './chatSendModel'
import { emitChatSessionsRefresh } from './chatSessionEvents'
import { sendChatStreamWithFallback } from './chatStreamSendFlow'
import { resolveChatTargetSession } from './chatTargetSessionResolver'
import { useChatMessageMutations } from './useChatMessageMutations'

interface UseChatSenderOptions {
  inputText: string
  pendingFiles: WorkspaceFileDTO[]
  activeSession: ChatSession | null
  shouldAutoScrollRef: MutableRefObject<boolean>
  setInputText: Dispatch<SetStateAction<string>>
  setSessions: Dispatch<SetStateAction<ChatSession[]>>
  setActiveId: Dispatch<SetStateAction<number | null>>
  applyRouteSessionId: (sessionId: number | null) => void
  recoverInvalidSession: (error: unknown) => Promise<boolean>
  clearPendingFiles: () => void
}

export function useChatSender({
  inputText,
  pendingFiles,
  activeSession,
  shouldAutoScrollRef,
  setInputText,
  setSessions,
  setActiveId,
  applyRouteSessionId,
  recoverInvalidSession,
  clearPendingFiles,
}: UseChatSenderOptions) {
  const [sending, setSending] = useState(false)
  const { updateAssistantMessage, upsertToolCall, appendMessageEvent, appendAssistantContent } =
    useChatMessageMutations(setSessions)

  const handleSend = async () => {
    const text = inputText.trim()
    if ((!text && pendingFiles.length === 0) || sending) {
      return
    }

    const targetSession = await resolveChatTargetSession({
      activeSession,
      setSessions,
      setActiveId,
      applyRouteSessionId,
      recoverInvalidSession,
    })
    if (!targetSession) {
      return
    }

    const sessionId = targetSession.id
    const userMsgId = Date.now()
    const aiMsgId = userMsgId + 1
    const currentAttachments = [...pendingFiles]

    const userMessage = createUserMessage(userMsgId, text, currentAttachments)
    const assistantPlaceholder = createAssistantPlaceholder(aiMsgId)
    const historyMessages = buildHistoryMessages(targetSession.messages, userMessage)

    setInputText('')
    clearPendingFiles()
    setSending(true)
    shouldAutoScrollRef.current = true
    setSessions((prev) =>
      appendOptimisticMessages(prev, targetSession, userMessage, assistantPlaceholder),
    )

    try {
      await sendChatStreamWithFallback({
        sessionId,
        aiMsgId,
        text,
        historyMessages,
        attachments: currentAttachments,
        appendAssistantContent,
        updateAssistantMessage,
        upsertToolCall,
        appendMessageEvent,
        recoverInvalidSession,
      })
    } finally {
      emitChatSessionsRefresh()
      setSending(false)
    }
  }

  return {
    sending,
    handleSend,
  }
}
