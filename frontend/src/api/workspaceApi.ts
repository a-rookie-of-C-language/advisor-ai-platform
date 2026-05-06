import request from './request'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface WorkspaceFileDTO {
  id: number
  fileName: string
  fileType: string
  fileSize: number
  createdAt: string
}

export const workspaceApi = {
  uploadFile: (sessionId: number, file: File) => {
    const formData = new FormData()
    formData.append('sessionId', sessionId.toString())
    formData.append('file', file)
    return request.post<unknown, ApiResponse<WorkspaceFileDTO>>('/workspace/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  listFiles: (sessionId: number) =>
    request.get<unknown, ApiResponse<WorkspaceFileDTO[]>>(`/workspace/sessions/${sessionId}/files`),

  deleteFile: (fileId: number) =>
    request.delete<unknown, ApiResponse<null>>(`/workspace/files/${fileId}`),
}
