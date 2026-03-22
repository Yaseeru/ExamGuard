import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { AlertTriangle } from 'lucide-react'

const ProtectedRoute = ({ children, requiredRole = null, allowedRoles = null }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600" role="progressbar"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check single required role
  if (requiredRole && user.role !== requiredRole) {
    return <AccessDenied />
  }

  // Check multiple allowed roles
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDenied />
  }

  return children
}

const AccessDenied = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center max-w-md mx-auto p-8">
      <div className="flex justify-center mb-4">
        <AlertTriangle className="h-16 w-16 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 mb-6">
        You don't have permission to access this page. Please contact your administrator if you believe this is an error.
      </p>
      <button 
        onClick={() => window.history.back()} 
        className="btn-secondary"
      >
        Go Back
      </button>
    </div>
  </div>
)

export default ProtectedRoute