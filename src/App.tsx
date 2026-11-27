import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppRoutes from './routes/routes'
import Login from './pages/Login'

function Gate() {
  const { user } = useAuth()
  return user ? <AppRoutes /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
