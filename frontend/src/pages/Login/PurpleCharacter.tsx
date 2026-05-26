import type { RefObject } from 'react'
import { EyeBall, type ForceLook } from './CharacterEyes'
import type { BodyPosition, SharedCharacterProps } from './AnimatedCharacterTypes'

interface PurpleCharacterProps extends SharedCharacterProps {
  characterRef: RefObject<HTMLDivElement>
  position: BodyPosition
  blinking: boolean
  forceLook: ForceLook | null
  isEmailFocused: boolean
  isHidingPassword: boolean
  isLookingAtEachOther: boolean
}

export function PurpleCharacter({
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
}: PurpleCharacterProps) {
  return (
    <div
      ref={characterRef}
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
          ? `skewX(${position.bodySkew - 12}deg) translateX(40px)`
          : `skewX(${position.bodySkew}deg)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          gap: '32px',
          left: `${isVisiblePassword ? 20 : isLookingAtEachOther ? 55 : 45 + position.faceX}px`,
          top: `${isVisiblePassword ? 35 : isLookingAtEachOther ? 65 : 40 + position.faceY}px`,
          transition: 'left 0.7s ease-in-out, top 0.7s ease-in-out',
        }}
      >
        <EyeBall size={18} pupilSize={7} maxDistance={5} blinking={blinking} forceLook={forceLook} mouseX={mouseX} mouseY={mouseY} />
        <EyeBall size={18} pupilSize={7} maxDistance={5} blinking={blinking} forceLook={forceLook} mouseX={mouseX} mouseY={mouseY} />
      </div>
    </div>
  )
}
