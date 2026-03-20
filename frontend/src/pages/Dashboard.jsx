import { useAuth } from '../contexts/AuthContext'
import { Users, BookOpen, FileText, BarChart3 } from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()

  const getDashboardContent = () => {
    switch (user?.role) {
      case 'Admin':
        return <AdminDashboard />
      case 'Lecturer':
        return <LecturerDashboard />
      case 'Student':
        return <StudentDashboard />
      default:
        return <div>Invalid user role</div>
    }
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
      
      {getDashboardContent()}
    </div>
  )
}

const AdminDashboard = () => {
  const stats = [
    { name: 'Total Users', value: '0', icon: Users, color: 'text-blue-600' },
    { name: 'Active Courses', value: '0', icon: BookOpen, color: 'text-green-600' },
    { name: 'Total Exams', value: '0', icon: FileText, color: 'text-purple-600' },
    { name: 'System Health', value: '100%', icon: BarChart3, color: 'text-orange-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management</h3>
          <p className="text-gray-600 mb-4">Manage students and lecturers in the system.</p>
          <button className="btn-primary">Manage Users</button>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Analytics</h3>
          <p className="text-gray-600 mb-4">View system usage and performance metrics.</p>
          <button className="btn-secondary">View Analytics</button>
        </div>
      </div>
    </div>
  )
}

const LecturerDashboard = () => {
  const stats = [
    { name: 'My Courses', value: '0', icon: BookOpen, color: 'text-blue-600' },
    { name: 'Active Exams', value: '0', icon: FileText, color: 'text-green-600' },
    { name: 'Students Enrolled', value: '0', icon: Users, color: 'text-purple-600' },
    { name: 'Pending Reviews', value: '0', icon: BarChart3, color: 'text-orange-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Management</h3>
          <p className="text-gray-600 mb-4">Create and manage your courses and enrollments.</p>
          <button className="btn-primary">Manage Courses</button>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Creation</h3>
          <p className="text-gray-600 mb-4">Create and schedule new examinations.</p>
          <button className="btn-primary">Create Exam</button>
        </div>
      </div>
    </div>
  )
}

const StudentDashboard = () => {
  const stats = [
    { name: 'Enrolled Courses', value: '0', icon: BookOpen, color: 'text-blue-600' },
    { name: 'Available Exams', value: '0', icon: FileText, color: 'text-green-600' },
    { name: 'Completed Exams', value: '0', icon: BarChart3, color: 'text-purple-600' },
    { name: 'Average Score', value: '0%', icon: Users, color: 'text-orange-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Enrollment</h3>
          <p className="text-gray-600 mb-4">Browse and enroll in available courses.</p>
          <button className="btn-primary">Browse Courses</button>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Take Exams</h3>
          <p className="text-gray-600 mb-4">Access your scheduled examinations.</p>
          <button className="btn-primary">View Exams</button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard