import request from './request'

export interface CourseScheduleImportResultVO {
  scheduleCount: number
  sessionCount: number
}

export interface ClassSessionVO {
  id: number
  term: string
  classCode: string
  courseCode: string
  courseName: string
  teacherName?: string
  weekNo: number
  weekday: number
  periodStart: number
  periodEnd: number
  sessionDate?: string
  startTime?: string
  endTime?: string
  location?: string
  status: string
}

export interface SessionAttendanceVO {
  id: number
  sessionId: number
  studentId: number
  studentNo: string
  studentName: string
  classCode: string
  status: string
  remark?: string
  recordedAt?: string
}

export interface AttendanceMarkRequest {
  studentId: number
  status: string
  remark?: string
}

export interface AttendanceWorkOrderVO {
  id: number
  sessionId: number
  classCode: string
  type: string
  status: string
  reason: string
  targetSessionDate?: string
  targetStartTime?: string
  targetEndTime?: string
  targetLocation?: string
  applicantId: number
  reviewerId?: number
  reviewNote?: string
  reviewedAt?: string
  createdAt: string
}

export interface CreateWorkOrderRequest {
  sessionId: number
  reason: string
  targetSessionDate?: string
  targetStartTime?: string
  targetEndTime?: string
  targetLocation?: string
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export const attendanceApi = {
  importSchedules: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post<unknown, ApiResponse<CourseScheduleImportResultVO>>(
      '/check-in/course-schedules/import',
      formData,
    )
  },

  listSessions: (params?: { term?: string; classCode?: string }) =>
    request.get<unknown, ApiResponse<ClassSessionVO[]>>('/check-in/class-sessions', { params }),

  getSessionAttendance: (sessionId: number) =>
    request.get<unknown, ApiResponse<SessionAttendanceVO[]>>(
      `/check-in/class-sessions/${sessionId}/attendance`,
    ),

  updateSessionAttendance: (sessionId: number, marks: AttendanceMarkRequest[]) =>
    request.put<unknown, ApiResponse<SessionAttendanceVO[]>>(
      `/check-in/class-sessions/${sessionId}/attendance`,
      { marks },
    ),

  createWorkOrder: (data: CreateWorkOrderRequest) =>
    request.post<unknown, ApiResponse<AttendanceWorkOrderVO>>('/check-in/work-orders', data),

  listWorkOrders: (params?: { classCode?: string; status?: string }) =>
    request.get<unknown, ApiResponse<AttendanceWorkOrderVO[]>>('/check-in/work-orders', {
      params,
    }),

  reviewWorkOrder: (workOrderId: number, status: string, reviewNote?: string) =>
    request.post<unknown, ApiResponse<AttendanceWorkOrderVO>>(
      `/check-in/work-orders/${workOrderId}/review`,
      { status, reviewNote },
    ),
}
