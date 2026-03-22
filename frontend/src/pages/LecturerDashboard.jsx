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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Lecturer Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your courses, exams, and student performance</p>
      </div>

      {/* Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-8">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  item.current
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {item.name}
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
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link key={stat.name} to={stat.href} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Management</h3>
          <p className="text-gray-600 mb-4">Create and manage your courses and enrollments.</p>
          <div className="flex space-x-3">
            <Link to="/lecturer/courses/new" className="btn-primary inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Link>
            <Link to="/lecturer/courses" className="btn-secondary">
              View All
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Creation</h3>
          <p className="text-gray-600 mb-4">Create and schedule new examinations.</p>
          <div className="flex space-x-3">
            <Link to="/lecturer/exams/new" className="btn-primary inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Exam
            </Link>
            <Link to="/lecturer/exams" className="btn-secondary">
              View All
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LecturerDashboard