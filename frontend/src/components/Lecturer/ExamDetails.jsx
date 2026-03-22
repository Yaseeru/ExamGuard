import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Calendar, Clock, Users, FileText, Trash2, BarChart3 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'

const ExamDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [course, setCourse] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExamDetails()
    fetchExamAttempts()
  }, [id])

  const fetchExamDetails = async () => {
    try {
      const response = await api.get(`/exams/${id}`)
      const examData = response.data.exam
      setExam(examData)
      
      // Fetch course details
      if (examData.courseId) {
        // Extract course ID - handle both object and string formats
        const courseId = examData.courseId._id || examData.courseId
        const courseResponse = await api.get(`/courses/${courseId}`)
        setCourse(courseResponse.data.course)
      }
    } catch (error) {
      console.error('Error fetching exam details:', error)
      toast.error('Failed to load exam details')
      navigate('/lecturer/exams')
    }
  }

  const fetchExamAttempts = async () => {
    try {
      const response = await api.get(`/results/exam/${id}`)
      setAttempts(response.data.attempts || [])
    } catch (error) {
      console.error('Error fetching exam attempts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExam = async () => {
    if (!window.confirm(`Are you sure you want to delete "${exam.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/exams/${id}`)
      toast.success('Exam deleted successfully')
      navigate('/lecturer/exams')
    } catch (error) {
      console.error('Error deleting exam:', error)
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete exam'
      toast.error(errorMessage)
    }
  }

  const getExamStatus = () => {
    if (!exam) return { status: 'unknown', color: 'text-gray-600 bg-gray-100' }
    
    const now = new Date()
    const startTime = new Date(exam.startTime)
    const endTime = new Date(exam.endTime)

    if (now < startTime) return { status: 'upcoming', color: 'text-blue-600 bg-blue-100' }
    if (now >= startTime && now <= endTime) return { status: 'active', color: 'text-green-600 bg-green-100' }
    return { status: 'completed', color: 'text-gray-600 bg-gray-100' }
  }
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Exam not found</p>
        <Link to="/lecturer/exams" className="btn-primary mt-4">
          Back to Exams
        </Link>
      </div>
    )
  }

  const examStatus = getExamStatus()
  const averageScore = attempts.length > 0 
    ? attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / attempts.length 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/lecturer/exams"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{exam.title}</h2>
            <p className="text-gray-600">Exam Details & Results</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${examStatus.color}`}>
            {examStatus.status.charAt(0).toUpperCase() + examStatus.status.slice(1)}
          </span>
          <Link
            to={`/lecturer/exams/${id}/edit`}
            className="btn-secondary inline-flex items-center"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Exam
          </Link>
          <button
            onClick={handleDeleteExam}
            className="btn-danger inline-flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Exam
          </button>
        </div>
      </div>
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Exam Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <p className="text-gray-900">{course?.title || 'Loading...'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <p className="text-gray-900 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {exam.duration} minutes
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <p className="text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(exam.startTime).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <p className="text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(exam.endTime).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Questions</label>
                <p className="text-gray-900">{exam.questions?.length || 0} questions</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Points</label>
                <p className="text-gray-900">{exam.totalPoints || exam.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0} points</p>
              </div>
            </div>
          </div>

          {/* Questions Preview */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions Preview</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {exam.questions?.map((question, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                    <span className="text-sm text-gray-600">{question.points || 1} point(s)</span>
                  </div>
                  <p className="text-gray-700 mb-3">{question.questionText}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {question.options?.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`p-2 rounded text-sm ${
                          optionIndex === question.correctAnswer
                            ? 'bg-green-100 text-green-800 font-medium'
                            : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {String.fromCharCode(65 + optionIndex)}. {option}
                        {optionIndex === question.correctAnswer && ' ✓'}
                      </div>
                    ))}
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No questions available</p>
              )}
            </div>
          </div>
        </div>
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistics */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Attempts</span>
                <span className="font-medium">{attempts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-medium">
                  {attempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">In Progress</span>
                <span className="font-medium">
                  {attempts.filter(a => a.status === 'in_progress').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average Score</span>
                <span className="font-medium">
                  {attempts.length > 0 ? `${averageScore.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Violations</span>
                <span className="font-medium text-red-600">
                  {attempts.reduce((sum, attempt) => sum + (attempt.violationCount || 0), 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to={`/lecturer/results?examId=${id}`}
                className="w-full btn-primary text-center inline-flex items-center justify-center"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Results
              </Link>
              <Link
                to={`/lecturer/exams/${id}/edit`}
                className="w-full btn-secondary text-center inline-flex items-center justify-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Exam
              </Link>
              {course && (
                <Link
                  to={`/lecturer/courses/${course._id}`}
                  className="w-full btn-secondary text-center inline-flex items-center justify-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Course
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExamDetails