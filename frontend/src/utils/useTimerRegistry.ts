import { useCallback, useEffect, useMemo, useRef } from 'react'

export function useTimerRegistry() {
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const intervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set())

  const clearManagedTimeout = useCallback((timeoutId: ReturnType<typeof setTimeout>) => {
    clearTimeout(timeoutId)
    timeoutsRef.current.delete(timeoutId)
  }, [])

  const clearManagedInterval = useCallback((intervalId: ReturnType<typeof setInterval>) => {
    clearInterval(intervalId)
    intervalsRef.current.delete(intervalId)
  }, [])

  const clearAllTimers = useCallback(() => {
    timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    intervalsRef.current.forEach((intervalId) => clearInterval(intervalId))
    timeoutsRef.current.clear()
    intervalsRef.current.clear()
  }, [])

  const setManagedTimeout = useCallback((handler: () => void, timeout: number) => {
    const timeoutId = setTimeout(() => {
      timeoutsRef.current.delete(timeoutId)
      handler()
    }, timeout)
    timeoutsRef.current.add(timeoutId)
    return timeoutId
  }, [])

  const setManagedInterval = useCallback((handler: () => void, timeout: number) => {
    const intervalId = setInterval(handler, timeout)
    intervalsRef.current.add(intervalId)
    return intervalId
  }, [])

  useEffect(() => clearAllTimers, [clearAllTimers])

  return useMemo(
    () => ({
      setTimeout: setManagedTimeout,
      clearTimeout: clearManagedTimeout,
      setInterval: setManagedInterval,
      clearInterval: clearManagedInterval,
      clearAll: clearAllTimers,
    }),
    [
      clearAllTimers,
      clearManagedInterval,
      clearManagedTimeout,
      setManagedInterval,
      setManagedTimeout,
    ],
  )
}
