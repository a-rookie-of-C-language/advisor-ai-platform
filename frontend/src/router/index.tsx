import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../components/Layout/MainLayout'
import { useAuthStore } from '../store/authStore'

const Login = lazy(() => import('../pages/Login/Login'))
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'))
const RAGPage = lazy(() => import('../pages/RAG/RAGPage'))
const ChatPage = lazy(() => import('../pages/Chat/ChatPage'))
const AuditPage = lazy(() => import('../pages/Audit/AuditPage'))
const MonitorPage = lazy(() => import('../pages/Monitor/MonitorPage'))
const StudentListPage = lazy(() => import('../pages/Student/StudentListPage'))
const StudentDetailPage = lazy(() => import('../pages/Student/StudentDetailPage'))
const CheckInManagementPage = lazy(() => import('../pages/Student/CheckInManagementPage'))
const AttendanceManagementPage = lazy(() => import('../pages/CheckIn/AttendanceManagementPage'))
const NotFound = lazy(() => import('../pages/NotFound'))

function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: ReactNode }) {
  const role = useAuthStore((s) => s.role)
  return role === 'ADMIN' ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<PageSuspense><Login /></PageSuspense>} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<PageSuspense><Dashboard /></PageSuspense>} />
        <Route path="rag" element={<PageSuspense><RAGPage /></PageSuspense>} />
        <Route path="chat" element={<PageSuspense><ChatPage /></PageSuspense>} />
        <Route
          path="audit"
          element={
            <AdminRoute>
              <PageSuspense><AuditPage /></PageSuspense>
            </AdminRoute>
          }
        />
        <Route
          path="monitor"
          element={
            <AdminRoute>
              <PageSuspense><MonitorPage /></PageSuspense>
            </AdminRoute>
          }
        />
        <Route path="student" element={<PageSuspense><StudentListPage /></PageSuspense>} />
        <Route path="student/:id" element={<PageSuspense><StudentDetailPage /></PageSuspense>} />
        <Route path="student/check-in" element={<PageSuspense><CheckInManagementPage /></PageSuspense>} />
        <Route
          path="attendance"
          element={
            <AdminRoute>
              <PageSuspense><AttendanceManagementPage /></PageSuspense>
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<PageSuspense><NotFound /></PageSuspense>} />
    </Routes>
  )
}
