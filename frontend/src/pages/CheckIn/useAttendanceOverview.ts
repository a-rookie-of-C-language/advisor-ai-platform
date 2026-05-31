import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  checkInApi,
  type AttendanceStatistics,
  type ClassAttendanceStatistics,
} from '../../api/checkInApi'
import { globalMessage } from '../../utils/globalMessage'

export type AttendanceDateRange = [dayjs.Dayjs, dayjs.Dayjs]

export function useAttendanceOverview() {
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState<AttendanceStatistics | null>(null)
  const [classStatistics, setClassStatistics] = useState<ClassAttendanceStatistics[]>([])
  const [dateRange, setDateRange] = useState<AttendanceDateRange>([
    dayjs().startOf('week'),
    dayjs().endOf('week'),
  ])

  const queryParams = useMemo(
    () => ({
      begin: dateRange[0].format('YYYY-MM-DD'),
      end: dateRange[1].format('YYYY-MM-DD'),
    }),
    [dateRange],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsResponse, classResponse] = await Promise.all([
        checkInApi.getAttendanceStatistics(queryParams),
        checkInApi.getClassAttendanceStatistics(queryParams),
      ])

      if (statsResponse.code === 200) {
        setStatistics(statsResponse.data)
      }

      if (classResponse.code === 200) {
        setClassStatistics(classResponse.data || [])
      }
    } catch {
      globalMessage.error('加载考勤数据失败')
    } finally {
      setLoading(false)
    }
  }, [queryParams])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    loading,
    statistics,
    classStatistics,
    dateRange,
    setDateRange,
  }
}
