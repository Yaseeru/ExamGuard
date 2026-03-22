import { useState, useEffect } from 'react'
import { FileText, Calendar, Clock, Filter, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'
import ExamCard from './ExamCard'

const ExamList = () => {
  const [exams, setExams] = useState([])
  const [examResults, setExamResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('available') // available, completed, all
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('all')
  const [enrolledCourses, setEnrolledCourses] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch enrolled courses
      const coursesResponse = await api.get('/courses/enrolled')
      const courses = coursesResponse.data.courses || []
      setEnrolledCourses(courses)

      // Fetch exams for enrolled courses
      const examsResponse = await api.get('/exams')
      const exams = examsResponse.data.exams || []
      setExams(exams)

      // Fetch exam results
      const resultsResponse = await api.get('/results/student')
      const results = resultsResponse.data.results || []
      setExamResults(results)
    } catch (error) {
      toast.error('Failed to fetch exam data')
      console.error('Error fetching exam data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExamStart = (attempt) => {
    // Redirect to exam interface or handle exam start
    toast.success('Redirecting to exam interface...')
    // In a real implementation, you would navigate to the exam taking interface
    // navigate(`/student/exam/${attempt._id}`)
  }

  const getFilteredExams = () => {
    let filtered = exams.filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           exam.courseId?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCourse = selectedCourse === 'all' || exam.courseId?._id === selectedCourse
      
      return matchesSearch && matchesCourse
    })

    switch (activeTab) {
      case 'available':
        return filtered.filter(exam => exam.isAvailable && !exam.hasAttempt)
      case 'completed':
        return filtered.filter(exam => exam.hasAttempt && 
          (exam.attemptStatus === 'submitted' || exam.attemptStatus === 'auto_submitted'))
      case 'in-progress':
        return filtered.filter(exam => exam.hasAttempt && exam.attemptStatus === 'in_progress')
      default:
        return filtered
    }
  }

  const getTabCount = (tab) => {
    switch (tab) {
      case 'available':
        return exams.filter(exam => exam.isAvailable && !exam.hasAttempt).length
      case 'completed':
        return exams.filter(exam => exam.hasAttempt && 
          (exam.attemptStatus === 'submitted' || exam.attemptStatus === 'auto_submitted')).length
      case 'in-progress':
        return exams.filter(exam => exam.hasAttempt && exam.attemptStatus === 'in_progress').length
      default:
        return exams.length
    }
  }

  const filteredExams = getFilteredExams()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading exams...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Exams</h2>
          <p className="text-gray-600 mt-1">
            View and access your examinations
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-sm text-gray-500">
          <FileText className="h-4 w-4" />
          <span>{exams.length} total exams</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'available', label: 'Available', icon: Calendar },
            { key: 'completed', label: 'Completed', icon: FileText },
            { key: 'in-progress', label: 'In Progress', icon: Clock },
            { key: 'all', label: 'All', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon
            const count = getTabCount(tab.key)
            
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
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search exams by title or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Courses</option>
            {enrolledCourses.map(course => (
              <option key={course._id} value={course._id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exam Grid */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeTab === 'available' ? 'No available exams' :
             activeTab === 'completed' ? 'No completed exams' :
             activeTab === 'in-progress' ? 'No exams in progress' :
             'No exams found'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || selectedCourse !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : activeTab === 'available' 
                ? 'Check back later for new exams'
                : 'Complete some exams to see them here'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map(exam => (
            <ExamCard
              key={exam._id}
              exam={exam}
              onExamStart={handleExamStart}
            />
          ))}
        </div>
      )}

      {/* Results Summary */}
      {examResults.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Performance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {examResults.length}
              </div>
              <div className="text-sm text-gray-600">Total Attempts</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {examResults.filter(result => result.status === 'submitted').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {examResults.length > 0
                  ? Math.round(examResults.reduce((sum, result) => sum + (result.score || 0), 0) / examResults.length)
                  : 0
                }%
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.max(...examResults.map(result => result.score || 0), 0)}%
              </div>
              <div className="text-sm text-gray-600">Best Score</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExamList