import { useEffect, useState } from 'react'
import {
  studentApi,
  type StudentCheckInDetailResponse,
  type StudentCheckInSummaryResponse,
  type StudentDetailResponse,
} from '../../api/studentApi'
import { globalMessage } from '../../utils/globalMessage'

export function useStudentDetailData(studentId: number, onInvalidStudentId: () => void) {
  const [loading, setLoading] = useState(false)
  const [student, setStudent] = useState<StudentDetailResponse | null>(null)
  const [summary, setSummary] = useState<StudentCheckInSummaryResponse | null>(null)
  const [detail, setDetail] = useState<StudentCheckInDetailResponse | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (Number.isNaN(studentId)) {
        globalMessage.error('学生ID不合法')
        onInvalidStudentId()
        return
      }

      setLoading(true)
      try {
        const [studentResponse, summaryResponse, detailResponse] = await Promise.all([
          studentApi.getById(studentId),
          studentApi.getCheckInSummary(studentId),
          studentApi.getCheckInDetail(studentId, 10),
        ])

        if (studentResponse.code === 200) {
          setStudent(studentResponse.data)
        }
        if (summaryResponse.code === 200) {
          setSummary(summaryResponse.data)
        }
        if (detailResponse.code === 200) {
          setDetail(detailResponse.data)
        }
      } catch {
        globalMessage.error('加载学生详情失败')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [studentId, onInvalidStudentId])

  return { loading, student, summary, detail }
}
