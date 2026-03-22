import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

const Dashboard = () => {
  const { user } = useAuth()

  // Redirect to role-specific dashboards
  if (user?.role === 'Admin') {
    return <Navigate to="/admin" replace />
  }
  
  if (user?.role === 'Lecturer') {
    return <Navigate to="/lecturer" replace />
  }
  
  if (user?.role === 'Student') {
    return <Navigate to="/student" replace />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-2">
          {user?.role} Dashboard - ExamGuard System
        </p>
      </div>
      
      <div>Invalid user role</div>
    </div>
  )
}
export default Dashboard