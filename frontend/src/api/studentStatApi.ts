import request from './request'

export interface StatOverviewResponse {
  totalStudents: number
  totalActive: number
  completeInfoCount: number
  partialMissingCount: number
  severeMissingCount: number
  missingInfoCount: number
  pendingTasks: number
  processingTasks: number
  completedTasks: number
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export const studentStatApi = {
  getOverview: () =>
    request.get<unknown, ApiResponse<StatOverviewResponse>>('/student/stat/overview'),
}
