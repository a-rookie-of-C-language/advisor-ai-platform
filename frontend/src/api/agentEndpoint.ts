export interface AgentStreamEndpoint {
  url: string
  headers: HeadersInit
}

function isTauriRuntime(): boolean {
  const win = window as Window & {
    __TAURI__?: object
    __TAURI_INTERNALS__?: object
  }
  return Boolean(win.__TAURI__ || win.__TAURI_INTERNALS__)
}

function resolveLocalAgentBaseUrl(): string {
  const fromStorage = window.localStorage.getItem('localAgentBaseUrl')?.trim()
  if (fromStorage) {
    return fromStorage
  }
  return (import.meta.env.VITE_LOCAL_AGENT_BASE_URL as string | undefined)?.trim() || 'http://127.0.0.1:8001'
}

function resolveLocalAgentToken(): string {
  const fromStorage = window.localStorage.getItem('localAgentToken')?.trim()
  if (fromStorage) {
    return fromStorage
  }
  return (import.meta.env.VITE_LOCAL_AGENT_TOKEN as string | undefined)?.trim() || ''
}

export function resolveAgentStreamEndpoint(gatewayToken: string): AgentStreamEndpoint {
  const forceLocal = (import.meta.env.VITE_AGENT_STREAM_MODE as string | undefined)?.trim() === 'local'
  const useLocalAgent = forceLocal || isTauriRuntime()

  if (useLocalAgent) {
    const localToken = resolveLocalAgentToken()
    if (!localToken) {
      throw new Error('local agent token missing')
    }
    return {
      url: `${resolveLocalAgentBaseUrl()}/chat/stream`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localToken}`,
        'X-Gateway-Token': gatewayToken,
      },
    }
  }

  return {
    url: '/api/chat/stream',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${gatewayToken}`,
    },
  }
}

