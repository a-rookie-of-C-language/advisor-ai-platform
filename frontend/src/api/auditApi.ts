import request from './request'

export type AuditModule = 'AUTH' | 'RAG' | 'MEMORY' | 'CHAT'

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'SEARCH'
  | 'QUERY'
  | 'UPLOAD_DOCUMENT'
  | 'DELETE_DOCUMENT'
  | 'STORE'
  | 'RETRIEVE'
  | 'UPDATE'
  | 'DELETE'
  | 'CHAT'
  | 'STREAM_CHAT'

export interface AuditLogDTO {
  id: number
  userId: number
  username: string
  module: AuditModule
  action: AuditAction
  method: string
  requestUri: string
  requestParams: string | null
  responseStatus: string
  responseData: string | null
  ipAddress: string
  userAgent: string
  durationMs: number
  errorMessage: string | null
  createdAt: string
}

export interface PageResponse<T> {
  records: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface AuditLogQueryParams {
  userId?: number
  module?: AuditModule
  action?: AuditAction
  startTime?: string
  endTime?: string
  page?: number
  size?: number
}

export const auditApi = {
  getAuditLogs: (params: AuditLogQueryParams) =>
    request.get<unknown, PageResponse<AuditLogDTO>>('/audit/logs', { params }),

  getAuditLogById: (id: number) =>
    request.get<unknown, AuditLogDTO>(`/audit/logs/${id}`),

  countByModule: (userId: number, module: AuditModule, action?: AuditAction) =>
    request.get<unknown, number>('/audit/stats/module', {
      params: { userId, module, action },
    }),
}