import request from './request'

export interface StudentTaskResponse {
  id: number
  studentId: number
  studentNo: string
  studentName: string
  taskType: number
  taskTypeText: string
  taskStatus: number
  taskStatusText: string
  assigneeNo: string
  assigneeName: string
  description: string
  handleNote: string
  handleTime: string
  createdAt: string
  updatedAt: string
}

export interface TaskQueryRequest {
  page?: number
  size?: number
  assigneeNo?: string
  taskStatus?: number
  taskType?: number
  studentId?: number
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface TaskCreateRequest {
  studentId: number
  taskType: number
  assigneeNo: string
  assigneeName: string
  description: string
}

export interface TaskStatusUpdateRequest {
  taskStatus: number
  assigneeNo?: string
  assigneeName?: string
  handleNote?: string
}

export const studentTaskApi = {
  list: (params: TaskQueryRequest) =>
    request.get<unknown, ApiResponse<PageResponse<StudentTaskResponse>>>('/student/task/list', { params }),

  getById: (id: number) =>
    request.get<unknown, ApiResponse<StudentTaskResponse>>(`/student/task/${id}`),

  create: (data: TaskCreateRequest) =>
    request.post<unknown, ApiResponse<StudentTaskResponse>>('/student/task', data),

  updateStatus: (id: number, data: TaskStatusUpdateRequest) =>
    request.patch<unknown, ApiResponse<StudentTaskResponse>>(`/student/task/${id}/status`, data),

  getByStudentId: (studentId: number, page = 0, size = 10) =>
    request.get<unknown, ApiResponse<PageResponse<StudentTaskResponse>>>(
      `/student/task/student/${studentId}`,
      { params: { page, size } },
    ),
}
