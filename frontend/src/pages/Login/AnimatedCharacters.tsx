import { useState, useEffect, useRef } from 'react'

interface ForceLook {
  x: number
  y: number
}

interface EyeBallProps {
  size: number
  pupilSize: number
  maxDistance: number
  eyeColor?: string
  pupilColor?: string
  blinking?: boolean
  forceLook?: ForceLook | null
  mouseX: number
  mouseY: number
}

function EyeBall({
  size,
  pupilSize,
  maxDistance,
  eyeColor = 'white',
  pupilColor = '#2D2D2D',
  blinking = false,
  forceLook,
  mouseX,
  mouseY,
}: EyeBallProps) {
  const eyeRef = useRef<HTMLDivElement>(null)

  const getPupilPos = () => {
    if (forceLook) return forceLook
    if (!eyeRef.current) return { x: 0, y: 0 }
    const rect = eyeRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const deltaX = mouseX - centerX
    const deltaY = mouseY - centerY
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance)
    const angle = Math.atan2(deltaY, deltaX)
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance }
  }

  const pupilPos = getPupilPos()

  return (
    <div
      ref={eyeRef}
      style={{
        width: `${size}px`,
        height: blinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'height 0.15s ease-out',
      }}
    >
      {!blinking && (
        <div
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            borderRadius: '50%',
            transform: `translate(${pupilPos.x}px, ${pupilPos.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  )
}

interface PupilProps {
  size: number
  maxDistance: number
  forceLook?: ForceLook | null
  mouseX: number
  mouseY: number
}

function Pupil({ size, maxDistance, forceLook, mouseX, mouseY }: PupilProps) {
  const ref = useRef<HTMLDivElement>(null)

  const getPos = () => {
    if (forceLook) return forceLook
    if (!ref.current) return { x: 0, y: 0 }
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const deltaX = mouseX - centerX
    const deltaY = mouseY - centerY
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance)
    const angle = Math.atan2(deltaY, deltaX)
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance }
  }

  const pos = getPos()

  return (
    <div
      ref={ref}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: '#2D2D2D',
        borderRadius: '50%',
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  )
}

export interface AnimatedCharactersProps {
  isEmailFocused: boolean
  isPasswordFocused: boolean
  showPassword: boolean
  passwordLength: number
}

export default function AnimatedCharacters({
  isEmailFocused,
  isPasswordFocused,
  showPassword,
  passwordLength,
}: AnimatedCharactersProps) {
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false)
  const [isBlackBlinking, setIsBlackBlinking] = useState(false)
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false)
  const [isPurplePeeking, setIsPurplePeeking] = useState(false)

  const purpleRef = useRef<HTMLDivElement>(null)
  const blackRef = useRef<HTMLDivElement>(null)
  const orangeRef = useRef<HTMLDivElement>(null)
  const yellowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX)
      setMouseY(e.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // 紫色角色眨眼
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const scheduleBlink = () => {
      timeoutId = setTimeout(() => {
        setIsPurpleBlinking(true)
        setTimeout(() => {
          setIsPurpleBlinking(false)
          scheduleBlink()
        }, 150)
      }, Math.random() * 4000 + 3000)
    }
    scheduleBlink()
    return () => clearTimeout(timeoutId)
  }, [])

  // 黑色角色眨眼
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const scheduleBlink = () => {
      timeoutId = setTimeout(() => {
        setIsBlackBlinking(true)
        setTimeout(() => {
          setIsBlackBlinking(false)
          scheduleBlink()
        }, 150)
      }, Math.random() * 4000 + 3000)
    }
    scheduleBlink()
    return () => clearTimeout(timeoutId)
  }, [])

  // 输入框聚焦时角色互望
  useEffect(() => {
    if (isEmailFocused || isPasswordFocused) {
      setIsLookingAtEachOther(true)
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800)
      return () => clearTimeout(t)
    } else {
      setIsLookingAtEachOther(false)
    }
  }, [isEmailFocused, isPasswordFocused])

  // 密码可见时紫色角色偷看
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

  const calcBodyPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 }
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

  const isHidingPassword = isPasswordFocused && passwordLength > 0 && !showPassword
  const isVisiblePassword = passwordLength > 0 && showPassword

  const pPos = calcBodyPos(purpleRef)
  const bPos = calcBodyPos(blackRef)
  const oPos = calcBodyPos(orangeRef)
  const yPos = calcBodyPos(yellowRef)

  const purplePupilForce: ForceLook | null = isVisiblePassword
    ? { x: isPurplePeeking ? 4 : -4, y: isPurplePeeking ? 5 : -4 }
    : isLookingAtEachOther
    ? { x: 3, y: 4 }
    : null

  const blackPupilForce: ForceLook | null = isVisiblePassword
    ? { x: -4, y: -4 }
    : isLookingAtEachOther
    ? { x: 0, y: -4 }
    : null

  return (
    <div style={{ position: 'relative', width: '550px', height: '440px' }}>
      {/* 紫色长方形 */}
      <div
        ref={purpleRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '70px',
          width: '180px',
          height: isEmailFocused || isHidingPassword ? '440px' : '400px',
          backgroundColor: '#6C3FF5',
          borderRadius: '10px 10px 0 0',
          zIndex: 1,
          transformOrigin: 'bottom center',
          transition: 'transform 0.7s ease-in-out, height 0.7s ease-in-out',
          transform: isVisiblePassword
            ? 'skewX(0deg)'
            : isEmailFocused || isHidingPassword
            ? `skewX(${pPos.bodySkew - 12}deg) translateX(40px)`
            : `skewX(${pPos.bodySkew}deg)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            gap: '32px',
            left: `${isVisiblePassword ? 20 : isLookingAtEachOther ? 55 : 45 + pPos.faceX}px`,
            top: `${isVisiblePassword ? 35 : isLookingAtEachOther ? 65 : 40 + pPos.faceY}px`,
            transition: 'left 0.7s ease-in-out, top 0.7s ease-in-out',
          }}
        >
          <EyeBall size={18} pupilSize={7} maxDistance={5} blinking={isPurpleBlinking} forceLook={purplePupilForce} mouseX={mouseX} mouseY={mouseY} />
          <EyeBall size={18} pupilSize={7} maxDistance={5} blinking={isPurpleBlinking} forceLook={purplePupilForce} mouseX={mouseX} mouseY={mouseY} />
        </div>
      </div>

      {/* 黑色长方形 */}
      <div
        ref={blackRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '240px',
          width: '120px',
          height: '310px',
          backgroundColor: '#2D2D2D',
          borderRadius: '8px 8px 0 0',
          zIndex: 2,
          transformOrigin: 'bottom center',
          transition: 'transform 0.7s ease-in-out',
          transform: isVisiblePassword
            ? 'skewX(0deg)'
            : isLookingAtEachOther
            ? `skewX(${bPos.bodySkew * 1.5 + 10}deg) translateX(20px)`
            : isEmailFocused || isHidingPassword
            ? `skewX(${bPos.bodySkew * 1.5}deg)`
            : `skewX(${bPos.bodySkew}deg)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            gap: '24px',
            left: `${isVisiblePassword ? 10 : isLookingAtEachOther ? 32 : 26 + bPos.faceX}px`,
            top: `${isVisiblePassword ? 28 : isLookingAtEachOther ? 12 : 32 + bPos.faceY}px`,
            transition: 'left 0.7s ease-in-out, top 0.7s ease-in-out',
          }}
        >
          <EyeBall size={16} pupilSize={6} maxDistance={4} blinking={isBlackBlinking} forceLook={blackPupilForce} mouseX={mouseX} mouseY={mouseY} />
          <EyeBall size={16} pupilSize={6} maxDistance={4} blinking={isBlackBlinking} forceLook={blackPupilForce} mouseX={mouseX} mouseY={mouseY} />
        </div>
      </div>

      {/* 橙色半圆 */}
      <div
        ref={orangeRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '0px',
          width: '240px',
          height: '200px',
          backgroundColor: '#FF9B6B',
          borderRadius: '120px 120px 0 0',
          zIndex: 3,
          transformOrigin: 'bottom center',
          transition: 'transform 0.7s ease-in-out',
          transform: isVisiblePassword ? 'skewX(0deg)' : `skewX(${oPos.bodySkew}deg)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            gap: '32px',
            left: `${isVisiblePassword ? 50 : 82 + oPos.faceX}px`,
            top: `${isVisiblePassword ? 85 : 90 + oPos.faceY}px`,
            transition: 'all 0.2s ease-out',
          }}
        >
          <Pupil size={12} maxDistance={5} forceLook={isVisiblePassword ? { x: -5, y: -4 } : null} mouseX={mouseX} mouseY={mouseY} />
          <Pupil size={12} maxDistance={5} forceLook={isVisiblePassword ? { x: -5, y: -4 } : null} mouseX={mouseX} mouseY={mouseY} />
        </div>
      </div>

      {/* 黄色圆角矩形 */}
      <div
        ref={yellowRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '310px',
          width: '140px',
          height: '230px',
          backgroundColor: '#E8D754',
          borderRadius: '70px 70px 0 0',
          zIndex: 4,
          transformOrigin: 'bottom center',
          transition: 'transform 0.7s ease-in-out',
          transform: isVisiblePassword ? 'skewX(0deg)' : `skewX(${yPos.bodySkew}deg)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            gap: '24px',
            left: `${isVisiblePassword ? 20 : 52 + yPos.faceX}px`,
            top: `${isVisiblePassword ? 35 : 40 + yPos.faceY}px`,
            transition: 'all 0.2s ease-out',
          }}
        >
          <Pupil size={12} maxDistance={5} forceLook={isVisiblePassword ? { x: -5, y: -4 } : null} mouseX={mouseX} mouseY={mouseY} />
          <Pupil size={12} maxDistance={5} forceLook={isVisiblePassword ? { x: -5, y: -4 } : null} mouseX={mouseX} mouseY={mouseY} />
        </div>
        <div
          style={{
            position: 'absolute',
            width: '80px',
            height: '4px',
            backgroundColor: '#2D2D2D',
            borderRadius: '999px',
            left: `${isVisiblePassword ? 10 : 40 + yPos.faceX}px`,
            top: `${isVisiblePassword ? 88 : 88 + yPos.faceY}px`,
            transition: 'all 0.2s ease-out',
          }}
        />
      </div>
    </div>
  )
}
