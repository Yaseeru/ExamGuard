import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Calendar, FileText, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'

const ExamCard = ({ exam, onExamStart }) => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleStartExam = async () => {
    if (!exam.isAvailable) {
      toast.error('Exam is not currently available')
      return
    }

    if (exam.hasAttempt) {
      toast.error('You have already attempted this exam')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/exam-attempts', {
        examId: exam._id
      })
      
      toast.success('Exam started successfully')
      // Navigate to exam interface
      navigate(`/student/exam/${response.data.attempt._id}`)
      
      // Call the callback if provided
      onExamStart?.(response.data.attempt)
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to start exam'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = () => {
    if (exam.hasAttempt) {
      switch (exam.attemptStatus) {
        case 'submitted':
        case 'auto_submitted':
          return <CheckCircle className="h-5 w-5 text-green-500" />
        case 'in_progress':
          return <Play className="h-5 w-5 text-blue-500" />
        default:
          return <XCircle className="h-5 w-5 text-red-500" />
      }
    }
    
    if (!exam.isAvailable) {
      return <XCircle className="h-5 w-5 text-gray-400" />
    }
    
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }

  const getStatusText = () => {
    if (exam.hasAttempt) {
      switch (exam.attemptStatus) {
        case 'submitted':
          return 'Completed'
        case 'auto_submitted':
          return 'Auto-submitted'
        case 'in_progress':
          return 'In Progress'
        default:
          return 'Attempted'
      }
    }
    
    if (!exam.isAvailable) {
      return 'Not Available'
    }
    
    return 'Available'
  }

  const getStatusColor = () => {
    if (exam.hasAttempt) {
      switch (exam.attemptStatus) {
        case 'submitted':
        case 'auto_submitted':
          return 'text-green-600 bg-green-50'
        case 'in_progress':
          return 'text-blue-600 bg-blue-50'
        default:
          return 'text-red-600 bg-red-50'
      }
    }
    
    if (!exam.isAvailable) {
      return 'text-gray-600 bg-gray-50'
    }
    
    return 'text-yellow-600 bg-yellow-50'
  }

  const isExamActive = () => {
    const now = new Date()
    const startTime = new Date(exam.startTime)
    const endTime = new Date(exam.endTime)
    return now >= startTime && now <= endTime
  }

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const startDateTime = formatDateTime(exam.startTime)
  const endDateTime = formatDateTime(exam.endTime)

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {exam.title}
            </h3>
            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="ml-1">{getStatusText()}</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            Course: {exam.courseId?.title || 'Unknown Course'}
          </p>
        </div>
      </div>

      {/* Exam Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>Duration: {exam.duration} minutes</span>
          </div>
          <div className="flex items-center text-gray-600">
            <FileText className="h-4 w-4 mr-2" />
            <span>{exam.questions?.length || 0} questions</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <div>
              <div className="font-medium">Start:</div>
              <div>{startDateTime.date} at {startDateTime.time}</div>
            </div>
          </div>
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <div>
              <div className="font-medium">End:</div>
              <div>{endDateTime.date} at {endDateTime.time}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Availability Status */}
      <div className="mb-4">
        {!isExamActive() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">
                {new Date() < new Date(exam.startTime) 
                  ? 'Exam has not started yet'
                  : 'Exam has ended'
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        {exam.hasAttempt ? (
          <button
            disabled
            className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            {exam.attemptStatus === 'in_progress' ? 'In Progress' : 'Completed'}
          </button>
        ) : exam.isAvailable && isExamActive() ? (
          <button
            onClick={handleStartExam}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting...
              </div>
            ) : (
              <div className="flex items-center">
                <Play className="h-4 w-4 mr-2" />
                Start Exam
              </div>
            )}
          </button>
        ) : (
          <button
            disabled
            className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            Not Available
          </button>
        )}
      </div>
    </div>
  )
}

export default ExamCard