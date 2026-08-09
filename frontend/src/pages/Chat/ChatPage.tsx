import { useEffect, useRef, useState } from 'react'
import { ChatConversationPanel } from './ChatConversationPanel'
import { ChatInputComposer } from './ChatInputComposer'
import { useChatMessagesLoader } from './useChatMessagesLoader'
import { useChatSender } from './useChatSender'
import { usePendingChatFiles } from './usePendingChatFiles'
import { useChatSessions } from './useChatSessions'
import styles from './ChatPage.module.css'

export default function ChatPage() {
  const [inputText, setInputText] = useState('')
  const [messagesLoading, setMessagesLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const msgListRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const {
    setSessions,
    activeId,
    setActiveId,
    activeSession,
    applyRouteSessionId,
    recoverInvalidSession,
  } = useChatSessions({ shouldAutoScrollRef })
  const {
    pendingFiles,
    uploading,
    handleFileSelect,
    clearPendingFiles,
    removePendingFile,
  } = usePendingChatFiles(activeSession)
  const { sending, handleSend } = useChatSender({
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
  })

  useChatMessagesLoader({
    activeId,
    setMessagesLoading,
    setSessions,
    recoverInvalidSession,
  })

  useEffect(() => {
    if (!activeSession) {
      return
    }
    if (!shouldAutoScrollRef.current) {
      return
    }
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }, [activeSession?.id, activeSession?.messages.length])

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <ChatConversationPanel
          activeSession={activeSession}
          messagesLoading={messagesLoading}
          msgListRef={msgListRef}
          bottomRef={bottomRef}
          onMessageListScroll={(event) => {
            const target = event.currentTarget
            const delta = target.scrollHeight - target.scrollTop - target.clientHeight
            shouldAutoScrollRef.current = delta < 80
          }}
        />

        <ChatInputComposer
          fileInputRef={fileInputRef}
          inputText={inputText}
          pendingFiles={pendingFiles}
          uploading={uploading}
          sending={sending}
          canUpload={Boolean(activeSession)}
          onFileSelect={(event) => void handleFileSelect(event)}
          onInputChange={setInputText}
          onSend={() => void handleSend()}
          onRemoveFile={(fileId) => {
            removePendingFile(fileId)
          }}
        />
      </main>
    </div>
  )
}
