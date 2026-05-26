import { useId } from 'react'
import PasswordVisibilityIcon from './PasswordVisibilityIcon'
import styles from './Login.module.css'
import type { useLoginForm } from './useLoginForm'

type LoginFormPanelProps = ReturnType<typeof useLoginForm>

export default function LoginFormPanel({
  username,
  setUsername,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  error,
  setIsUsernameFocused,
  setIsPasswordFocused,
  handleSubmit,
}: LoginFormPanelProps) {
  const usernameId = useId()
  const passwordId = useId()

  return (
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
                <PasswordVisibilityIcon open={showPassword} />
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
  )
}
