import { useAuth } from '../../contexts/AuthContext'

/**
 * RoleGuard component for conditional rendering based on user roles
 * @param {Object} props
 * @param {string|string[]} props.allowedRoles - Single role or array of roles allowed to see content
 * @param {string} props.requiredRole - Single required role (alternative to allowedRoles)
 * @param {React.ReactNode} props.children - Content to render if user has permission
 * @param {React.ReactNode} props.fallback - Content to render if user doesn't have permission
 */
const RoleGuard = ({ 
  children, 
  allowedRoles = null, 
  requiredRole = null, 
  fallback = null 
}) => {
  const { user } = useAuth()

  if (!user) {
    return fallback
  }

  let hasPermission = false

  if (requiredRole) {
    hasPermission = user.role === requiredRole
  } else if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    hasPermission = roles.includes(user.role)
  } else {
    // If no role restrictions specified, allow all authenticated users
    hasPermission = true
  }

  return hasPermission ? children : fallback
}

export default RoleGuard