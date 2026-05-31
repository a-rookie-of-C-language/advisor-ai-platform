import { useEffect, useState, type RefObject } from 'react'
import { useTimerRegistry } from '../../utils/useTimerRegistry'

export type BodyPosition = {
  faceX: number
  faceY: number
  bodySkew: number
}

export function useMousePosition() {
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX)
      setMouseY(event.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return { mouseX, mouseY }
}

export function useBlink(): boolean {
  const [isBlinking, setIsBlinking] = useState(false)
  const timers = useTimerRegistry()

  useEffect(() => {
    const scheduleBlink = () => {
      timers.setTimeout(() => {
        setIsBlinking(true)
        timers.setTimeout(() => {
          setIsBlinking(false)
          scheduleBlink()
        }, 150)
      }, Math.random() * 4000 + 3000)
    }
    scheduleBlink()
    return timers.clearAll
  }, [timers])

  return isBlinking
}

export function useFocusLook(isEmailFocused: boolean, isPasswordFocused: boolean): boolean {
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false)
  const timers = useTimerRegistry()

  useEffect(() => {
    if (isEmailFocused || isPasswordFocused) {
      setIsLookingAtEachOther(true)
      timers.setTimeout(() => setIsLookingAtEachOther(false), 800)
      return timers.clearAll
    }
    setIsLookingAtEachOther(false)
    return undefined
  }, [isEmailFocused, isPasswordFocused, timers])

  return isLookingAtEachOther
}

export function usePurplePeek(passwordLength: number, showPassword: boolean): boolean {
  const [isPurplePeeking, setIsPurplePeeking] = useState(false)
  const timers = useTimerRegistry()

  useEffect(() => {
    if (passwordLength > 0 && showPassword) {
      timers.setInterval(() => {
        if (Math.random() > 0.5) {
          setIsPurplePeeking(true)
          timers.setTimeout(() => setIsPurplePeeking(false), 800)
        }
      }, 2500)
    } else {
      setIsPurplePeeking(false)
    }
    return timers.clearAll
  }, [passwordLength, showPassword, timers])

  return isPurplePeeking
}

export function calcBodyPos(
  ref: RefObject<HTMLDivElement | null>,
  mouseX: number,
  mouseY: number,
): BodyPosition {
  if (!ref.current) {
    return { faceX: 0, faceY: 0, bodySkew: 0 }
  }
  const rect = ref.current.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 3
  const deltaX = mouseX - centerX
  const deltaY = mouseY - centerY

  return {
    faceX: Math.max(-15, Math.min(15, deltaX / 20)),
    faceY: Math.max(-10, Math.min(10, deltaY / 30)),
    bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
  }
}
