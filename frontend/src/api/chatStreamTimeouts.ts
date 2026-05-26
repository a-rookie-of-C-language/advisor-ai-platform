export type StreamTimeoutType = 'first_packet' | 'idle'

export function createStreamTimeouts(
  controller: AbortController,
  firstPacketTimeoutMs: number,
  idleTimeoutMs: number,
) {
  let timeoutType: StreamTimeoutType | null = null
  let firstPacketTimer: ReturnType<typeof setTimeout> | null = null
  let idleTimer: ReturnType<typeof setTimeout> | null = null

  const clearFirstPacketTimer = () => {
    if (firstPacketTimer) {
      clearTimeout(firstPacketTimer)
      firstPacketTimer = null
    }
  }

  const clearIdleTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  return {
    startFirstPacketTimer() {
      clearFirstPacketTimer()
      firstPacketTimer = setTimeout(() => {
        timeoutType = 'first_packet'
        controller.abort()
      }, firstPacketTimeoutMs)
    },
    markFirstPacketReceived() {
      clearFirstPacketTimer()
    },
    resetIdleTimer() {
      clearIdleTimer()
      idleTimer = setTimeout(() => {
        timeoutType = 'idle'
        controller.abort()
      }, idleTimeoutMs)
    },
    getTimeoutType() {
      return timeoutType
    },
    clear() {
      clearFirstPacketTimer()
      clearIdleTimer()
    },
  }
}

export function normalizeStreamError(error: unknown, timeoutType: StreamTimeoutType | null): unknown {
  if (timeoutType === 'first_packet') {
    return new Error('stream timeout: first packet > 30s')
  }
  if (timeoutType === 'idle') {
    return new Error('stream timeout: idle > 60s')
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return new Error('stream aborted')
  }
  return error
}
