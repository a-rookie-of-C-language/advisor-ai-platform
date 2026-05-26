import type { RefObject } from 'react'
import { EyeBall, type ForceLook } from './CharacterEyes'
import type { BodyPosition, SharedCharacterProps } from './AnimatedCharacterTypes'

interface BlackCharacterProps extends SharedCharacterProps {
  characterRef: RefObject<HTMLDivElement>
  position: BodyPosition
  blinking: boolean
  forceLook: ForceLook | null
  isEmailFocused: boolean
  isHidingPassword: boolean
  isLookingAtEachOther: boolean
}

export function BlackCharacter({
  characterRef,
  position,
  blinking,
  forceLook,
  isEmailFocused,
  isHidingPassword,
  isLookingAtEachOther,
  isVisiblePassword,
  mouseX,
  mouseY,
}: BlackCharacterProps) {
  return (
    <div
      ref={characterRef}
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
          ? `skewX(${position.bodySkew * 1.5 + 10}deg) translateX(20px)`
          : isEmailFocused || isHidingPassword
          ? `skewX(${position.bodySkew * 1.5}deg)`
          : `skewX(${position.bodySkew}deg)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          gap: '24px',
          left: `${isVisiblePassword ? 10 : isLookingAtEachOther ? 32 : 26 + position.faceX}px`,
          top: `${isVisiblePassword ? 28 : isLookingAtEachOther ? 12 : 32 + position.faceY}px`,
          transition: 'left 0.7s ease-in-out, top 0.7s ease-in-out',
        }}
      >
        <EyeBall size={16} pupilSize={6} maxDistance={4} blinking={blinking} forceLook={forceLook} mouseX={mouseX} mouseY={mouseY} />
        <EyeBall size={16} pupilSize={6} maxDistance={4} blinking={blinking} forceLook={forceLook} mouseX={mouseX} mouseY={mouseY} />
      </div>
    </div>
  )
}
