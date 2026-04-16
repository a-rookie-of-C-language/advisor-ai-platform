import type { MessageInstance } from 'antd/es/message/interface'

type MessageContent = Parameters<MessageInstance['open']>[0] | Parameters<MessageInstance['success']>[0]

let messageApi: MessageInstance | null = null

export function setGlobalMessageApi(api: MessageInstance) {
  messageApi = api
}

function withMessageApi<T>(fn: (api: MessageInstance) => T) {
  if (!messageApi) {
    return undefined
  }
  return fn(messageApi)
}

export const globalMessage = {
  success(content: MessageContent) {
    return withMessageApi((api) => api.success(content))
  },
  warning(content: MessageContent) {
    return withMessageApi((api) => api.warning(content))
  },
  error(content: MessageContent) {
    return withMessageApi((api) => api.error(content))
  },
  info(content: MessageContent) {
    return withMessageApi((api) => api.info(content))
  },
}
