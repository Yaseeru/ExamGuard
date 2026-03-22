import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import RoleGuard from '../Auth/RoleGuard'
import ResponsiveNavigation from '../Common/ResponsiveNavigation'
import { LogOut, Shield, Settings, BookOpen, Users, Home } from 'lucide-react'
import useResponsive from '../../hooks/useResponsive'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile } = useResponsive()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleNavigate = (path) => {
    navigate(path)
  }

  // Build navigation items based on user role
  const getNavigationItems = () => {
    if (!user) return []

    const items = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: Home
      }
    ]

    // Add role-specific items
    if (user.role === 'Admin') {
      items.push({
        id: 'admin',
        label: 'Admin Panel',
        path: '/admin',
        icon: Settings
      })
    }

    if (user.role === 'Lecturer') {
      items.push({
        id: 'lecturer',
        label: 'My Courses',
        path: '/lecturer',
        icon: BookOpen
      })
    }

    if (user.role === 'Student') {
      items.push({
        id: 'student',
        label: 'My Courses',
        path: '/student',
        icon: Users
      })
    }

    return items
  }

  const navigationItems = getNavigationItems()

  // Brand component
  const brand = (
    <Link 
      to="/" 
      className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
      aria-label="ExamGuard - Go to homepage"
    >
      <Shield className="h-8 w-8 text-primary-600" aria-hidden="true" />
      <span className="text-xl font-bold text-gray-900">ExamGuard</span>
    </Link>
  )

  // User actions
  const userActions = user ? (
    <div className="flex items-center space-x-2">
      {!isMobile && (
        <div className="text-sm text-right">
          <div className="font-medium text-gray-900">{user.name}</div>
          <div className="text-xs text-gray-500">{user.role}</div>
        </div>
      )}
      <button
        onClick={handleLogout}
        className="flex items-center space-x-1 text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
        aria-label="Logout from ExamGuard"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span>Logout</span>
      </button>
    </div>
  ) : (
    <Link 
      to="/login" 
      className="btn-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Login
    </Link>
  )

  return (
    <ResponsiveNavigation
      items={navigationItems}
      currentPath={location.pathname}
      onNavigate={handleNavigate}
      brand={brand}
      actions={userActions}
      className="bg-white shadow-sm border-b border-gray-200"
    />
  )
}

export default Header