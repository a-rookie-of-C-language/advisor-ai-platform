import type { MessageInstance } from 'antd/es/message/interface'

type MessageContent = Parameters<MessageInstance['open']>[0] | Parameters<MessageInstance['success']>[0]

let messageApi: MessageInstance | null = null
const dedupeWindowMs = 2000
const dedupeCache = new Map<string, number>()

export function setGlobalMessageApi(api: MessageInstance) {
  messageApi = api
}

function withMessageApi<T>(fn: (api: MessageInstance) => T) {
  if (!messageApi) {
    return undefined
  }
  return fn(messageApi)
}

function resolveDedupeKey(level: 'success' | 'warning' | 'error' | 'info', content: MessageContent): string {
  if (typeof content === 'string') {
    return `${level}:${content}`
  }
  if (typeof content === 'object' && content !== null && 'content' in content) {
    const value = (content as { content?: unknown }).content
    if (typeof value === 'string') {
      return `${level}:${value}`
    }
  }
  return `${level}:${String(content)}`
}

function shouldSuppress(level: 'success' | 'warning' | 'error' | 'info', content: MessageContent): boolean {
  const key = resolveDedupeKey(level, content)
  const now = Date.now()
  const last = dedupeCache.get(key)
  dedupeCache.set(key, now)
  return typeof last === 'number' && now - last < dedupeWindowMs
}

export const globalMessage = {
  success(content: MessageContent) {
    if (shouldSuppress('success', content)) {
      return undefined
    }
    return withMessageApi((api) => api.success(content))
  },
  warning(content: MessageContent) {
    if (shouldSuppress('warning', content)) {
      return undefined
    }
    return withMessageApi((api) => api.warning(content))
  },
  error(content: MessageContent) {
    if (shouldSuppress('error', content)) {
      return undefined
    }
    return withMessageApi((api) => api.error(content))
  },
  info(content: MessageContent) {
    if (shouldSuppress('info', content)) {
      return undefined
    }
    return withMessageApi((api) => api.info(content))
  },
}
