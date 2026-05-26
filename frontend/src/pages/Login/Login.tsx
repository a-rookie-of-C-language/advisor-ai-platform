import styles from './Login.module.css'
import LoginBrandPanel from './LoginBrandPanel'
import LoginFormPanel from './LoginFormPanel'
import { useLoginForm } from './useLoginForm'

export default function Login() {
  const loginForm = useLoginForm()

  return (
    <div className={styles.container}>
      {/* 左侧动画面板 */}
      <LoginBrandPanel
        isUsernameFocused={loginForm.isUsernameFocused}
        isPasswordFocused={loginForm.isPasswordFocused}
        showPassword={loginForm.showPassword}
        passwordLength={loginForm.password.length}
      />

      {/* 右侧登录面板 */}
      <LoginFormPanel {...loginForm} />
    </div>
  )
}
