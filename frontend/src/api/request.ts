import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

request.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // 只在非登录页时跳转，避免登录失败导致页面死循环
      if (!window.location.pathname.includes('/login')) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error.response?.data?.message ?? '请求失败')
  },
)

export default request
