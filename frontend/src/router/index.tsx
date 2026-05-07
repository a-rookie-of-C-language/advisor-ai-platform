import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../components/Layout/MainLayout'
import Login from '../pages/Login/Login'
import Dashboard from '../pages/Dashboard/Dashboard'
import RAGPage from '../pages/RAG/RAGPage'
import ChatPage from '../pages/Chat/ChatPage'
import AuditPage from '../pages/Audit/AuditPage'
import MonitorPage from '../pages/Monitor/MonitorPage'
import StudentListPage from '../pages/Student/StudentListPage'
import TaskManagementPage from '../pages/Student/TaskManagementPage'
import ImportManagementPage from '../pages/Student/ImportManagementPage'
import StatOverviewPage from '../pages/Student/StatOverviewPage'
import { useAuthStore } from '../store/authStore'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.role)
  return role === 'ADMIN' ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="rag" element={<RAGPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route
          path="audit"
          element={
            <AdminRoute>
              <AuditPage />
            </AdminRoute>
          }
        />
        <Route
          path="monitor"
          element={
            <AdminRoute>
              <MonitorPage />
            </AdminRoute>
          }
        />
        <Route path="student" element={<StudentListPage />} />
        <Route path="student/task" element={<TaskManagementPage />} />
        <Route path="student/import" element={<ImportManagementPage />} />
        <Route path="student/stat" element={<StatOverviewPage />} />
      </Route>
    </Routes>
  )
}
