import { FilePdfOutlined, FileTextOutlined, FileWordOutlined } from '@ant-design/icons'
import type { KnowledgeBaseDTO, RagDocumentDTO } from '../../api/ragApi'

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  return '请求失败，请稍后重试'
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileIcon(type: string) {
  const normalized = type.toLowerCase()
  if (normalized === 'pdf') return <FilePdfOutlined style={{ color: '#EF4444', fontSize: 16 }} />
  if (normalized === 'docx') return <FileWordOutlined style={{ color: '#2563EB', fontSize: 16 }} />
  return <FileTextOutlined style={{ color: '#6B7280', fontSize: 16 }} />
}

export const kbStatusColor: Record<KnowledgeBaseDTO['status'], string> = {
  READY: 'green',
  INDEXING: 'orange',
  FAILED: 'red',
}

export const kbStatusLabel: Record<KnowledgeBaseDTO['status'], string> = {
  READY: '就绪',
  INDEXING: '索引中',
  FAILED: '失败',
}

export const docStatusColor: Record<RagDocumentDTO['status'], string> = {
  PENDING: 'gold',
  INDEXING: 'orange',
  READY: 'green',
  FAILED: 'red',
}

export const docStatusLabel: Record<RagDocumentDTO['status'], string> = {
  PENDING: '待处理',
  INDEXING: '索引中',
  READY: '就绪',
  FAILED: '失败',
}
