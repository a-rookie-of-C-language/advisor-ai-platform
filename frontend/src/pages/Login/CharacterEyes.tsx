import { type RefObject, useRef } from 'react'

export interface ForceLook {
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

function calcLookPosition({
  ref,
  forceLook,
  mouseX,
  mouseY,
  maxDistance,
}: {
  ref: RefObject<HTMLDivElement | null>
  forceLook: ForceLook | null | undefined
  mouseX: number
  mouseY: number
  maxDistance: number
}): ForceLook {
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

export function EyeBall({
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
  const pupilPos = calcLookPosition({ ref: eyeRef, forceLook, mouseX, mouseY, maxDistance })

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

export function Pupil({ size, maxDistance, forceLook, mouseX, mouseY }: PupilProps) {
  const ref = useRef<HTMLDivElement>(null)
  const pos = calcLookPosition({ ref, forceLook, mouseX, mouseY, maxDistance })

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
