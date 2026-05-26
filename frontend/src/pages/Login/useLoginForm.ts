import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/authApi'
import { useAuthStore } from '../../store/authStore'

export function useLoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isUsernameFocused, setIsUsernameFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)

  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }
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

  return {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    loading,
    error,
    isUsernameFocused,
    setIsUsernameFocused,
    isPasswordFocused,
    setIsPasswordFocused,
    handleSubmit,
  }
}
