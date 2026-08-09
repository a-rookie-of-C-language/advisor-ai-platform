import type { RefObject } from 'react'
import { Pupil } from './CharacterEyes'
import type { BodyPosition, SharedCharacterProps } from './AnimatedCharacterTypes'

interface OrangeCharacterProps extends SharedCharacterProps {
  characterRef: RefObject<HTMLDivElement>
  position: BodyPosition
}

export function OrangeCharacter({
  characterRef,
  position,
  isVisiblePassword,
  mouseX,
  mouseY,
}: OrangeCharacterProps) {
  const forceLook = isVisiblePassword ? { x: -5, y: -4 } : null

  return (
    <div
      ref={characterRef}
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
        transform: isVisiblePassword ? 'skewX(0deg)' : `skewX(${position.bodySkew}deg)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          gap: '32px',
          left: `${isVisiblePassword ? 50 : 82 + position.faceX}px`,
          top: `${isVisiblePassword ? 85 : 90 + position.faceY}px`,
          transition: 'all 0.2s ease-out',
        }}
      >
        <Pupil size={12} maxDistance={5} forceLook={forceLook} mouseX={mouseX} mouseY={mouseY} />
        <Pupil size={12} maxDistance={5} forceLook={forceLook} mouseX={mouseX} mouseY={mouseY} />
      </div>
    </div>
  )
}
