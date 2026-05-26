import { useEffect, useState, type RefObject } from 'react'

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

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const scheduleBlink = () => {
      timeoutId = setTimeout(() => {
        setIsBlinking(true)
        setTimeout(() => {
          setIsBlinking(false)
          scheduleBlink()
        }, 150)
      }, Math.random() * 4000 + 3000)
    }
    scheduleBlink()
    return () => clearTimeout(timeoutId)
  }, [])

  return isBlinking
}

export function useFocusLook(isEmailFocused: boolean, isPasswordFocused: boolean): boolean {
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false)

  useEffect(() => {
    if (isEmailFocused || isPasswordFocused) {
      setIsLookingAtEachOther(true)
      const timeoutId = setTimeout(() => setIsLookingAtEachOther(false), 800)
      return () => clearTimeout(timeoutId)
    }
    setIsLookingAtEachOther(false)
    return undefined
  }, [isEmailFocused, isPasswordFocused])

  return isLookingAtEachOther
}

export function usePurplePeek(passwordLength: number, showPassword: boolean): boolean {
  const [isPurplePeeking, setIsPurplePeeking] = useState(false)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>
    if (passwordLength > 0 && showPassword) {
      intervalId = setInterval(() => {
        if (Math.random() > 0.5) {
          setIsPurplePeeking(true)
          setTimeout(() => setIsPurplePeeking(false), 800)
        }
      }, 2500)
    } else {
      setIsPurplePeeking(false)
    }
    return () => clearInterval(intervalId)
  }, [passwordLength, showPassword])

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
