import { useState, useEffect } from 'react'
import { BookOpen, FileText, Calendar, TrendingUp, Users, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'
import CourseBrowser from './CourseBrowser'
import EnrolledCourses from './EnrolledCourses'
import ExamList from './ExamList'
import StudentResults from './StudentResults'

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboardStats, setDashboardStats] = useState({
    enrolledCourses: 0,
    availableExams: 0,
    completedExams: 0,
    averageScore: 0,
    upcomingExams: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch enrolled courses
      const coursesResponse = await api.get('/courses/enrolled')
      const enrolledCourses = coursesResponse.data.courses || []

      // Fetch exams
      const examsResponse = await api.get('/exams')
      const exams = examsResponse.data.exams || []

      // Fetch exam attempts/results
      const attemptsResponse = await api.get('/exam-attempts')
      const attempts = attemptsResponse.data.attempts || []

      // Calculate stats
      const availableExams = exams.filter(exam => exam.isAvailable && !exam.hasAttempt)
      const completedAttempts = attempts.filter(attempt => 
        attempt.status === 'submitted' || attempt.status === 'auto_submitted'
      )
      
      const averageScore = completedAttempts.length > 0
        ? Math.round(completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / completedAttempts.length)
        : 0

      // Get upcoming exams (next 7 days)
      const now = new Date()
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const upcomingExams = availableExams
        .filter(exam => {
          const startTime = new Date(exam.startTime)
          return startTime >= now && startTime <= nextWeek
        })
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .slice(0, 5)

      setDashboardStats({
        enrolledCourses: enrolledCourses.length,
        availableExams: availableExams.length,
        completedExams: completedAttempts.length,
        averageScore,
        upcomingExams
      })
    } catch (error) {
      toast.error('Failed to fetch dashboard data')
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'courses', label: 'My Courses', icon: BookOpen },
    { key: 'browse', label: 'Browse Courses', icon: Users },
    { key: 'exams', label: 'Exams', icon: FileText },
    { key: 'results', label: 'Results', icon: TrendingUp }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'courses':
        return <EnrolledCourses />
      case 'browse':
        return <CourseBrowser />
      case 'exams':
        return <ExamList />
      case 'results':
        return <StudentResults />
      default:
        return <OverviewTab stats={dashboardStats} loading={loading} />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Manage your courses and examinations
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  )
}

const OverviewTab = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Enrolled Courses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.enrolledCourses}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Exams</p>
              <p className="text-2xl font-bold text-gray-900">{stats.availableExams}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Exams</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedExams}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Upcoming Exams */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Exams</h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          
          {stats.upcomingExams.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">No upcoming exams</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.upcomingExams.map(exam => (
                <div key={exam._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">{exam.title}</h4>
                    <p className="text-xs text-gray-600">{exam.courseId?.title}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-xs text-gray-600">
                      <Clock className="h-3 w-3 mr-1" />
                      {exam.duration}min
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(exam.startTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard