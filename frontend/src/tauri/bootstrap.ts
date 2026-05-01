import { invoke } from '@tauri-apps/api/core'

interface AgentBootstrapResult {
  base_url: string
  token: string
  port: number
}

function isTauriRuntime(): boolean {
  const win = window as Window & {
    __TAURI__?: object
    __TAURI_INTERNALS__?: object
  }
  return Boolean(win.__TAURI__ || win.__TAURI_INTERNALS__)
}

export async function bootstrapLocalAgentForTauri(): Promise<void> {
  if (!isTauriRuntime()) {
    return
  }

  try {
    const result = await invoke<AgentBootstrapResult>('start_agent_daemon')
    if (!result?.base_url || !result?.token) {
      return
    }
    window.localStorage.setItem('localAgentBaseUrl', result.base_url)
    window.localStorage.setItem('localAgentToken', result.token)
  } catch (error) {
    console.error('tauri bootstrap local agent failed', error)
  }
}
