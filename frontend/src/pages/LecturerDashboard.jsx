import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { BookOpen, FileText, BarChart3, Users, Plus } from 'lucide-react'
import api from '../utils/api'
import CourseManagement from '../components/Lecturer/CourseManagement'
import ExamManagement from '../components/Lecturer/ExamManagement'
import ResultsAnalytics from '../components/Lecturer/ResultsAnalytics'

const LecturerDashboard = () => {
  const location = useLocation()
  const [stats, setStats] = useState({
    courses: 0,
    exams: 0,
    students: 0,
    pendingReviews: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch courses
      const coursesResponse = await api.get('/courses')
      const courses = coursesResponse.data.courses || []
      
      // Fetch exams
      const examsResponse = await api.get('/exams')
      const exams = examsResponse.data.exams || []
      
      // Calculate total enrolled students across all courses
      const totalStudents = courses.reduce((sum, course) => {
        return sum + (course.enrolledStudents?.length || 0)
      }, 0)
      
      setStats({
        courses: courses.length,
        exams: exams.length,
        students: totalStudents,
        pendingReviews: 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const navigation = [
    { name: 'Overview', href: '/lecturer', icon: BarChart3, current: location.pathname === '/lecturer' },
    { name: 'Courses', href: '/lecturer/courses', icon: BookOpen, current: location.pathname.startsWith('/lecturer/courses') },
    { name: 'Exams', href: '/lecturer/exams', icon: FileText, current: location.pathname.startsWith('/lecturer/exams') },
    { name: 'Results', href: '/lecturer/results', icon: Users, current: location.pathname.startsWith('/lecturer/results') },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Lecturer Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage your courses, exams, and student performance</p>
      </div>

      {/* Navigation - Mobile Responsive */}
      <div className="mb-6 sm:mb-8 overflow-x-auto">
        <nav className="flex space-x-2 sm:space-x-4 lg:space-x-8 min-w-max sm:min-w-0">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  item.current
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{item.name}</span>
                <span className="sm:hidden">{item.name.split(' ')[0]}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <Routes>
        <Route path="/" element={<LecturerOverview stats={stats} />} />
        <Route path="/courses/*" element={<CourseManagement />} />
        <Route path="/exams/*" element={<ExamManagement />} />
        <Route path="/results/*" element={<ResultsAnalytics />} />
      </Routes>
    </div>
  )
}

const LecturerOverview = ({ stats }) => {
  const statCards = [
    { name: 'My Courses', value: stats.courses, icon: BookOpen, color: 'text-blue-600', href: '/lecturer/courses' },
    { name: 'Active Exams', value: stats.exams, icon: FileText, color: 'text-green-600', href: '/lecturer/exams' },
    { name: 'Students Enrolled', value: stats.students, icon: Users, color: 'text-purple-600', href: '/lecturer/results' },
    { name: 'Pending Reviews', value: stats.pendingReviews, icon: BarChart3, color: 'text-orange-600', href: '/lecturer/results' },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((stat) => (
          <Link key={stat.name} to={stat.href} className="card hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="flex-shrink-0 mb-2 sm:mb-0">
                <stat.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.color}`} />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Course Management</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">Create and manage your courses and enrollments.</p>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Link to="/lecturer/courses/new" className="btn-primary inline-flex items-center justify-center text-sm sm:text-base">
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Link>
            <Link to="/lecturer/courses" className="btn-secondary text-sm sm:text-base text-center">
              View All
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Exam Creation</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">Create and schedule new examinations.</p>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Link to="/lecturer/exams/new" className="btn-primary inline-flex items-center justify-center text-sm sm:text-base">
              <Plus className="h-4 w-4 mr-2" />
              New Exam
            </Link>
            <Link to="/lecturer/exams" className="btn-secondary text-sm sm:text-base text-center">
              View All
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LecturerDashboard