import { useRef } from 'react'
import type { ForceLook } from './CharacterEyes'
import {
  calcBodyPos,
  useBlink,
  useFocusLook,
  useMousePosition,
  usePurplePeek,
} from './useAnimatedCharacterMotion'

interface UseAnimatedCharacterSceneParams {
  isEmailFocused: boolean
  isPasswordFocused: boolean
  showPassword: boolean
  passwordLength: number
}

export function useAnimatedCharacterScene({
  isEmailFocused,
  isPasswordFocused,
  showPassword,
  passwordLength,
}: UseAnimatedCharacterSceneParams) {
  const { mouseX, mouseY } = useMousePosition()
  const isPurpleBlinking = useBlink()
  const isBlackBlinking = useBlink()
  const isLookingAtEachOther = useFocusLook(isEmailFocused, isPasswordFocused)
  const isPurplePeeking = usePurplePeek(passwordLength, showPassword)

  const purpleRef = useRef<HTMLDivElement>(null)
  const blackRef = useRef<HTMLDivElement>(null)
  const orangeRef = useRef<HTMLDivElement>(null)
  const yellowRef = useRef<HTMLDivElement>(null)

  const isHidingPassword = isPasswordFocused && passwordLength > 0 && !showPassword
  const isVisiblePassword = passwordLength > 0 && showPassword

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

  return {
    mouseX,
    mouseY,
    isPurpleBlinking,
    isBlackBlinking,
    isLookingAtEachOther,
    isHidingPassword,
    isVisiblePassword,
    purpleRef,
    blackRef,
    orangeRef,
    yellowRef,
    purplePosition: calcBodyPos(purpleRef, mouseX, mouseY),
    blackPosition: calcBodyPos(blackRef, mouseX, mouseY),
    orangePosition: calcBodyPos(orangeRef, mouseX, mouseY),
    yellowPosition: calcBodyPos(yellowRef, mouseX, mouseY),
    purplePupilForce,
    blackPupilForce,
  }
}
