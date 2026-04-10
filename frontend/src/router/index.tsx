import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../components/Layout/MainLayout'
import Login from '../pages/Login/Login'
import Dashboard from '../pages/Dashboard/Dashboard'
import PolicyPage from '../pages/Policy/PolicyPage'
import CasePage from '../pages/Case/CasePage'
import MethodPage from '../pages/Method/MethodPage'
import TrainingPage from '../pages/Training/TrainingPage'
import { useAuthStore } from '../store/authStore'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
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
        <Route path="policy" element={<PolicyPage />} />
        <Route path="case" element={<CasePage />} />
        <Route path="method" element={<MethodPage />} />
        <Route path="training" element={<TrainingPage />} />
      </Route>
    </Routes>
  )
}
