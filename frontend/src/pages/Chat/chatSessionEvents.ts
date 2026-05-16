const CHAT_SESSIONS_REFRESH_EVENT = 'chat:sessions:refresh'

export function emitChatSessionsRefresh() {
  window.dispatchEvent(new CustomEvent(CHAT_SESSIONS_REFRESH_EVENT))
}

export function onChatSessionsRefresh(listener: () => void): () => void {
  const wrapped = () => listener()
  window.addEventListener(CHAT_SESSIONS_REFRESH_EVENT, wrapped)
  return () => {
    window.removeEventListener(CHAT_SESSIONS_REFRESH_EVENT, wrapped)
  }
}
