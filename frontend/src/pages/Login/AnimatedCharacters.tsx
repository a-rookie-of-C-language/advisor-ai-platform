import {
  BlackCharacter,
  OrangeCharacter,
  PurpleCharacter,
  YellowCharacter,
} from './AnimatedCharacterShapes'
import { useAnimatedCharacterScene } from './useAnimatedCharacterScene'

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
  const scene = useAnimatedCharacterScene({
    isEmailFocused,
    isPasswordFocused,
    showPassword,
    passwordLength,
  })

  return (
    <div style={{ position: 'relative', width: '550px', height: '440px' }}>
      <PurpleCharacter
        characterRef={scene.purpleRef}
        position={scene.purplePosition}
        blinking={scene.isPurpleBlinking}
        forceLook={scene.purplePupilForce}
        isEmailFocused={isEmailFocused}
        isHidingPassword={scene.isHidingPassword}
        isLookingAtEachOther={scene.isLookingAtEachOther}
        isVisiblePassword={scene.isVisiblePassword}
        mouseX={scene.mouseX}
        mouseY={scene.mouseY}
      />
      <BlackCharacter
        characterRef={scene.blackRef}
        position={scene.blackPosition}
        blinking={scene.isBlackBlinking}
        forceLook={scene.blackPupilForce}
        isEmailFocused={isEmailFocused}
        isHidingPassword={scene.isHidingPassword}
        isLookingAtEachOther={scene.isLookingAtEachOther}
        isVisiblePassword={scene.isVisiblePassword}
        mouseX={scene.mouseX}
        mouseY={scene.mouseY}
      />
      <OrangeCharacter
        characterRef={scene.orangeRef}
        position={scene.orangePosition}
        isVisiblePassword={scene.isVisiblePassword}
        mouseX={scene.mouseX}
        mouseY={scene.mouseY}
      />
      <YellowCharacter
        characterRef={scene.yellowRef}
        position={scene.yellowPosition}
        isVisiblePassword={scene.isVisiblePassword}
        mouseX={scene.mouseX}
        mouseY={scene.mouseY}
      />
    </div>
  )
}
