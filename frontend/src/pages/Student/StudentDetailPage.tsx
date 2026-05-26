import { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StudentBasicInfoCard from './StudentBasicInfoCard'
import StudentCheckInSummaryCards from './StudentCheckInSummaryCards'
import StudentDetailActions from './StudentDetailActions'
import StudentRecentCheckInCard from './StudentRecentCheckInCard'
import { useStudentDetailData } from './useStudentDetailData'

export default function StudentDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const studentId = Number(params.id)
  const handleInvalidStudentId = useCallback(() => {
    navigate('/student', { replace: true })
  }, [navigate])
  const { loading, student, summary, detail } = useStudentDetailData(
    studentId,
    handleInvalidStudentId,
  )

  return (
    <div style={{ padding: 24 }}>
      <StudentDetailActions
        onBack={() => navigate('/student')}
        onCheckInManagement={() => navigate('/student/check-in')}
      />
      <StudentBasicInfoCard loading={loading} student={student} />
      <StudentCheckInSummaryCards loading={loading} summary={summary} />
      <StudentRecentCheckInCard loading={loading} detail={detail} />
    </div>
  )
}
