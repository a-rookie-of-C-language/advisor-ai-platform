import AnimatedCharacters from './AnimatedCharacters'
import styles from './Login.module.css'

interface LoginBrandPanelProps {
  isUsernameFocused: boolean
  isPasswordFocused: boolean
  showPassword: boolean
  passwordLength: number
}

export default function LoginBrandPanel({
  isUsernameFocused,
  isPasswordFocused,
  showPassword,
  passwordLength,
}: LoginBrandPanelProps) {
  return (
    <div className={styles.leftPanel} aria-hidden="true">
      <div className={styles.logo}>辅导员智库</div>
      <div className={styles.charactersWrapper}>
        <AnimatedCharacters
          isEmailFocused={isUsernameFocused}
          isPasswordFocused={isPasswordFocused}
          showPassword={showPassword}
          passwordLength={passwordLength}
        />
      </div>
      <div className={styles.leftFooter}>
        <a href="#">隐私政策</a>
        <a href="#">使用条款</a>
      </div>
      <div className={styles.bgBlur1} />
      <div className={styles.bgBlur2} />
    </div>
  )
}
