import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function GeneralManagerRoute() {
  const { user } = useAuth()

  if (!user || user.role !== 'GENERAL_MANAGER') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
