import request from './request'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  username: string
  realName: string
  role: string
}

export const authApi = {
  login: (params: LoginParams) =>
    request.post<unknown, { code: number; data: LoginResult }>('/auth/login', params),

  register: (params: { username: string; password: string; realName: string; phone?: string; email?: string }) =>
    request.post('/auth/register', params),
}
