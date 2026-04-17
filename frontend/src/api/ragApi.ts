import request from './request'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export type KnowledgeBaseStatus = 'READY' | 'INDEXING' | 'FAILED'

export interface KnowledgeBaseDTO {
  id: number
  name: string
  description: string
  docCount: number
  status: KnowledgeBaseStatus
  createdAt: string
}

export interface RagDocumentDTO {
  id: number
  fileName: string
  fileType: string
  fileSize: number
  status: 'PENDING' | 'INDEXING' | 'READY' | 'FAILED'
  createdAt: string
}

export const ragApi = {
  listKnowledgeBases: () =>
    request.get<unknown, ApiResponse<KnowledgeBaseDTO[]>>('/rag/knowledge-bases'),

  createKnowledgeBase: (params: { name: string; description?: string }) =>
    request.post<unknown, ApiResponse<KnowledgeBaseDTO>>('/rag/knowledge-bases', params),

  deleteKnowledgeBase: (id: number) =>
    request.delete<unknown, ApiResponse<null>>(`/rag/knowledge-bases/${id}`),

  listDocuments: (kbId: number) =>
    request.get<unknown, ApiResponse<RagDocumentDTO[]>>(`/rag/knowledge-bases/${kbId}/documents`),

  uploadDocument: (kbId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post<unknown, ApiResponse<RagDocumentDTO>>(
      `/rag/knowledge-bases/${kbId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )
  },

  deleteDocument: (id: number) =>
    request.delete<unknown, ApiResponse<null>>(`/rag/documents/${id}`),
}
