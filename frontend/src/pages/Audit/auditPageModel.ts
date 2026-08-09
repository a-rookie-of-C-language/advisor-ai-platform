import type { AuditAction, AuditModule } from '../../api/auditApi'

export const moduleColors: Record<AuditModule, string> = {
  AUTH: 'blue',
  RAG: 'green',
  MEMORY: 'purple',
  CHAT: 'orange',
}

export const moduleLabels: Record<AuditModule, string> = {
  AUTH: '认证',
  RAG: '知识库',
  MEMORY: '记忆',
  CHAT: '对话',
}

export const actionLabels: Record<AuditAction, string> = {
  LOGIN: '登录',
  LOGOUT: '登出',
  SEARCH: '搜索',
  QUERY: '查询',
  UPLOAD_DOCUMENT: '上传文档',
  DELETE_DOCUMENT: '删除文档',
  STORE: '存储',
  RETRIEVE: '检索',
  UPDATE: '更新',
  DELETE: '删除',
  CHAT: '对话',
  STREAM_CHAT: '流式对话',
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
