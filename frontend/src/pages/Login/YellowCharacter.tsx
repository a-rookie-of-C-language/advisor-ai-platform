import type { RefObject } from 'react'
import { Pupil } from './CharacterEyes'
import type { BodyPosition, SharedCharacterProps } from './AnimatedCharacterTypes'

interface YellowCharacterProps extends SharedCharacterProps {
  characterRef: RefObject<HTMLDivElement>
  position: BodyPosition
}

export function YellowCharacter({
  characterRef,
  position,
  isVisiblePassword,
  mouseX,
  mouseY,
}: YellowCharacterProps) {
  const forceLook = isVisiblePassword ? { x: -5, y: -4 } : null

  return (
    <div
      ref={characterRef}
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
        transform: isVisiblePassword ? 'skewX(0deg)' : `skewX(${position.bodySkew}deg)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          gap: '24px',
          left: `${isVisiblePassword ? 20 : 52 + position.faceX}px`,
          top: `${isVisiblePassword ? 35 : 40 + position.faceY}px`,
          transition: 'all 0.2s ease-out',
        }}
      >
        <Pupil size={12} maxDistance={5} forceLook={forceLook} mouseX={mouseX} mouseY={mouseY} />
        <Pupil size={12} maxDistance={5} forceLook={forceLook} mouseX={mouseX} mouseY={mouseY} />
      </div>
      <div
        style={{
          position: 'absolute',
          width: '80px',
          height: '4px',
          backgroundColor: '#2D2D2D',
          borderRadius: '999px',
          left: `${isVisiblePassword ? 10 : 40 + position.faceX}px`,
          top: `${isVisiblePassword ? 88 : 88 + position.faceY}px`,
          transition: 'all 0.2s ease-out',
        }}
      />
    </div>
  )
}
