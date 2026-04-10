import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/authApi'
import { useAuthStore } from '../../store/authStore'
import styles from './Login.module.css'
import AnimatedCharacters from './AnimatedCharacters'

// 密码显示/隐藏图标
 function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}

export default function Login() {
  const usernameId = useId()
  const passwordId = useId()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isUsernameFocused, setIsUsernameFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)

  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) { setError('请输入用户名'); return }
    if (!password) { setError('请输入密码'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login({ username: username.trim(), password })
      const { token, username: uname, realName, role } = res.data
      setAuth(token, uname, realName, role)
      navigate('/dashboard')
    } catch (err) {
      setError(typeof err === 'string' ? err : '用户名或密码错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* 左侧动画面板 */}
      <div className={styles.leftPanel} aria-hidden="true">
        <div className={styles.logo}>辅导员智库</div>
        <div className={styles.charactersWrapper}>
          <AnimatedCharacters
            isEmailFocused={isUsernameFocused}
            isPasswordFocused={isPasswordFocused}
            showPassword={showPassword}
            passwordLength={password.length}
          />
        </div>
        <div className={styles.leftFooter}>
          <a href="#">隐私政策</a>
          <a href="#">使用条款</a>
        </div>
        <div className={styles.bgBlur1} />
        <div className={styles.bgBlur2} />
      </div>

      {/* 右侧登录面板 */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          {/* 移动端 Logo */}
          <div className={styles.mobileLogo} aria-label="辅导员智库">辅导员智库</div>

          <header className={styles.header}>
            <h1 className={styles.title}>欢迎回来</h1>
            <p className={styles.subtitle}>重庆理工大学 · 辅导员智能支持平台</p>
          </header>

          <form
            onSubmit={handleSubmit}
            noValidate
            className={styles.form}
            aria-label="登录表单"
          >
            {/* 用户名 */}
            <div className={styles.fieldGroup}>
              <label htmlFor={usernameId} className={styles.label}>用户名</label>
              <input
                id={usernameId}
                type="text"
                autoComplete="username"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setIsUsernameFocused(true)}
                onBlur={() => setIsUsernameFocused(false)}
                className={styles.input}
                aria-required="true"
                aria-invalid={!!error && !username}
              />
            </div>

            {/* 密码 */}
            <div className={styles.fieldGroup}>
              <label htmlFor={passwordId} className={styles.label}>密码</label>
              <div className={styles.passwordWrapper}>
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  className={`${styles.input} ${styles.inputPassword}`}
                  aria-required="true"
                  aria-invalid={!!error && !password}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  tabIndex={0}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div role="alert" className={styles.errorBanner}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
              aria-busy={loading}
            >
              {loading ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : null}
              {loading ? '登录中…' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
