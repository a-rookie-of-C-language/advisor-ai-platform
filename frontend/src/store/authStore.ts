import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  username: string | null
  realName: string | null
  role: string | null
  setAuth: (token: string, username: string, realName: string, role: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      realName: null,
      role: null,
      setAuth: (token, username, realName, role) =>
        set({ token, username, realName, role }),
      logout: () => set({ token: null, username: null, realName: null, role: null }),
    }),
    { name: 'auth-storage' },
  ),
)
