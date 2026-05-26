import type { AuditAction, AuditModule } from '../../api/auditApi'

export const moduleColors: Record<AuditModule, string> = {
  AUTH: 'blue',
  RAG: 'green',
  MEMORY: 'purple',
  CHAT: 'orange',
}

export const moduleLabels: Record<AuditModule, string> = {
  AUTH: '璁よ瘉',
  RAG: '知识库',
  MEMORY: '璁板繂',
  CHAT: '瀵硅瘽',
}

export const actionLabels: Record<AuditAction, string> = {
  LOGIN: '鐧诲綍',
  LOGOUT: '鐧诲嚭',
  SEARCH: '鎼滅储',
  QUERY: '鏌ヨ',
  UPLOAD_DOCUMENT: '涓婁紶鏂囨。',
  DELETE_DOCUMENT: '鍒犻櫎鏂囨。',
  STORE: '瀛樺偍',
  RETRIEVE: '检索',
  UPDATE: '鏇存柊',
  DELETE: '鍒犻櫎',
  CHAT: '瀵硅瘽',
  STREAM_CHAT: '娴佸紡瀵硅瘽',
}

export interface QueryParams {
  module?: AuditModule
  action?: AuditAction
  startTime?: string
  endTime?: string
  page: number
  size: number
}

export function getAuditErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }
  return '请求失败，请稍后重试'
}

export function formatAuditJson(value: string | null): string {
  if (!value) {
    return '-'
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}
