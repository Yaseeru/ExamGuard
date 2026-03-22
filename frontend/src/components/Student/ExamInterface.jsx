import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, AlertTriangle, CheckCircle, Send, ArrowLeft, ArrowRight, Shield, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'
import ExamTimer from './ExamTimer'
import ViolationWarning from './ViolationWarning'
import QuestionNavigation from './QuestionNavigation'
import useAntiCheating from '../../hooks/useAntiCheating'

const ExamInterface = () => {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  
  // Exam state
  const [attempt, setAttempt] = useState(null)
  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [timerWarnings, setTimerWarnings] = useState({ warning: false, critical: false })
  
  // Anti-cheating state
  const [violations, setViolations] = useState(0)
  const [showViolationWarning, setShowViolationWarning] = useState(false)
  const [violationMessage, setViolationMessage] = useState('')
  const [isSecureMode, setIsSecureMode] = useState(false)
  
  // UI state
  const [showQuestionList, setShowQuestionList] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved') // 'saving', 'saved', 'error'
  
  // Refs
  const lastSyncRef = useRef(Date.now())
  const violationTimeoutRef = useRef(null)
  const autoSaveTimeoutRef = useRef(null)

  // Define recordViolation function before using it in the hook
  const recordViolation = async (type, details) => {
    try {
      const response = await api.post(`/exam-attempts/${attemptId}/violation`, {
        type,
        details
      })

      const { violationCount, warningLevel, autoSubmitted } = response.data
      setViolations(violationCount)

      if (autoSubmitted) {
        toast.error('🚨 Exam submitted automatically due to multiple violations!', {
          duration: 8000,
          icon: '🚨'
        })
        navigate('/student/exams')
        return
      }

      // Enhanced warning messages based on violation count
      let message = ''
      let toastMessage = ''
      
      if (violationCount === 1) {
        message = `⚠️ First Warning: Suspicious activity detected (${type.replace('_', ' ')}). You have 2 warnings remaining before automatic submission.`
        toastMessage = '⚠️ First violation warning - 2 warnings remaining'
      } else if (violationCount === 2) {
        message = `🚨 Final Warning: Another violation detected (${type.replace('_', ' ')}). ONE MORE VIOLATION will result in automatic exam submission!`
        toastMessage = '🚨 Final warning - One more violation will auto-submit your exam!'
      } else if (violationCount >= 3) {
        message = `🚨 Violation Limit Reached: Your exam has been automatically submitted due to multiple security violations.`
        toastMessage = '🚨 Exam auto-submitted due to violations'
      }

      if (message) {
        setViolationMessage(message)
        setShowViolationWarning(true)
        
        // Show toast notification as well
        if (violationCount === 1) {
          toast(toastMessage, { duration: 5000, icon: '⚠️' })
        } else if (violationCount === 2) {
          toast.error(toastMessage, { duration: 8000 })
        }
        
        // Auto-hide warning modal after appropriate time
        if (violationTimeoutRef.current) {
          clearTimeout(violationTimeoutRef.current)
        }
        
        const hideDelay = violationCount >= 2 ? 12000 : 8000 // Longer display for critical warnings
        violationTimeoutRef.current = setTimeout(() => {
          setShowViolationWarning(false)
        }, hideDelay)
      }

    } catch (error) {
      console.error('Failed to record violation:', error)
      // Don't show error to user as this might be used maliciously
    }
  }

  // Anti-cheating hook
  const { setupAntiCheating, cleanupAntiCheating } = useAntiCheating(
    isSecureMode, 
    recordViolation
  )

  // Load exam attempt data
  useEffect(() => {
    if (attemptId) {
      loadExamAttempt()
    }
  }, [attemptId])

  // Setup anti-cheating when exam starts
  useEffect(() => {
    if (attempt?.status === 'in_progress') {
      setIsSecureMode(true)
    } else {
      setIsSecureMode(false)
    }
  }, [attempt?.status])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (violationTimeoutRef.current) {
        clearTimeout(violationTimeoutRef.current)
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  const loadExamAttempt = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/exam-attempts/${attemptId}`)
      const attemptData = response.data.attempt
      
      if (!attemptData) {
        throw new Error('No attempt data received')
      }
      
      setAttempt(attemptData)
      setExam(attemptData.examId)
      setQuestions(attemptData.examId.questions || [])
      setTimeRemaining(attemptData.timeRemaining || 0)
      setViolations(attemptData.violationCount || 0)
      
      // Load existing answers
      const existingAnswers = {}
      attemptData.answers?.forEach(answer => {
        existingAnswers[answer.questionId] = answer.selectedOption
      })
      setAnswers(existingAnswers)
      
    } catch (error) {
      console.error('Failed to load exam attempt:', error)
      toast.error('Failed to load exam. Please try again.')
      navigate('/student/exams')
    } finally {
      setLoading(false)
    }
  }

  const syncTimer = async (currentTime) => {
    try {
      await api.put(`/exam-attempts/${attemptId}/timer`, {
        timeRemaining: currentTime
      })
      lastSyncRef.current = Date.now()
    } catch (error) {
      console.error('Timer sync failed:', error)
      // Don't show error to user as this is background sync
    }
  }

  const handleTimeUpdate = useCallback((newTime) => {
    setTimeRemaining(newTime)
    
    // Update warning states
    const warningThreshold = 300 // 5 minutes
    const criticalThreshold = 60 // 1 minute
    
    setTimerWarnings({
      warning: newTime <= warningThreshold && newTime > criticalThreshold,
      critical: newTime <= criticalThreshold && newTime > 0
    })
    
    // Sync with backend every 30 seconds
    if (Date.now() - lastSyncRef.current > 30000) {
      syncTimer(newTime)
    }
  }, [attemptId])

  const handleTimeExpired = useCallback(async () => {
    try {
      setSubmitting(true)
      await api.put(`/exam-attempts/${attemptId}/timer`, {
        timeRemaining: 0
      })
      toast.error('Time expired! Exam submitted automatically.')
      navigate('/student/exams')
    } catch (error) {
      console.error('Auto-submit failed:', error)
      toast.error('Failed to auto-submit exam. Please contact support.')
    }
  }, [attemptId, navigate])

  const handleTimerWarning = useCallback((timeLeft, level) => {
    if (level === 'critical') {
      toast.error(`Only ${Math.floor(timeLeft / 60)} minute${Math.floor(timeLeft / 60) !== 1 ? 's' : ''} remaining!`, {
        duration: 5000,
        icon: '⏰'
      })
    } else if (level === 'warning') {
      toast(`${Math.floor(timeLeft / 60)} minutes remaining`, {
        duration: 3000,
        icon: '⚠️'
      })
    }
  }, [])

  const handleAnswerSelect = async (questionId, selectedOption) => {
    try {
      setAutoSaveStatus('saving')
      
      // Update local state immediately for better UX
      setAnswers(prev => ({
        ...prev,
        [questionId]: selectedOption
      }))

      // Save to backend
      await api.put(`/exam-attempts/${attemptId}/answer`, {
        questionId,
        selectedOption
      })

      setAutoSaveStatus('saved')
      
      // Clear any existing timeout and set new one
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        setAutoSaveStatus('saved')
      }, 2000)

    } catch (error) {
      console.error('Failed to save answer:', error)
      setAutoSaveStatus('error')
      toast.error('Failed to save answer. Please try again.')
      
      // Revert local state on error
      setAnswers(prev => {
        const newAnswers = { ...prev }
        delete newAnswers[questionId]
        return newAnswers
      })
    }
  }

  const handleSubmitExam = async () => {
    const answeredCount = Object.keys(answers).length
    const totalQuestions = questions.length
    const unansweredCount = totalQuestions - answeredCount
    
    let confirmMessage = 'Are you sure you want to submit your exam? This action cannot be undone.'
    
    if (unansweredCount > 0) {
      confirmMessage = `You have ${unansweredCount} unanswered question${unansweredCount !== 1 ? 's' : ''}. These will be marked as incorrect. Are you sure you want to submit?`
    }
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    setSubmitting(true)
    try {
      const response = await api.post(`/exam-attempts/${attemptId}/submit`)
      const { score, totalQuestions: total, answeredQuestions } = response.data
      
      toast.success(`Exam submitted successfully! Score: ${score}/${total} (${answeredQuestions} answered)`, {
        duration: 5000
      })
      navigate('/student/exams')
    } catch (error) {
      console.error('Failed to submit exam:', error)
      toast.error('Failed to submit exam. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Navigation helpers
  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index)
      setShowQuestionList(false)
    }
  }

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  // Helper functions
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerColor = () => {
    if (timerWarnings.critical) return 'text-red-600'
    if (timerWarnings.warning) return 'text-orange-600'
    return 'text-green-600'
  }

  const getAutoSaveIndicator = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return (
          <div className="flex items-center text-blue-600 text-sm">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
            Saving...
          </div>
        )
      case 'saved':
        return (
          <div className="flex items-center text-green-600 text-sm">
            <CheckCircle className="h-3 w-3 mr-1" />
            Saved
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center text-red-600 text-sm">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Save failed
          </div>
        )
      default:
        return null
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Exam</h2>
          <p className="text-gray-600">Please wait while we prepare your exam...</p>
        </div>
      </div>
    )
  }

  if (!attempt || attempt.status !== 'in_progress') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
          <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Not Available</h2>
          <p className="text-gray-600 mb-6">
            {attempt?.status === 'submitted' 
              ? 'This exam has already been submitted.'
              : 'This exam is not currently in progress.'
            }
          </p>
          <button
            onClick={() => navigate('/student/exams')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Exams
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isSecureMode ? 'exam-secure-content' : ''}`} style={{ userSelect: isSecureMode ? 'none' : 'auto' }}>
      {/* Enhanced Violation Warning Modal */}
      <ViolationWarning
        isVisible={showViolationWarning}
        onClose={() => setShowViolationWarning(false)}
        violationCount={violations}
        message={violationMessage}
        autoHideDelay={violations >= 2 ? 12000 : 8000}
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{exam?.title}</h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </p>
              </div>
              
              {/* Secure mode indicator */}
              {isSecureMode && (
                <div className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  <Shield className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Secure Mode</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Auto-save status */}
              {getAutoSaveIndicator()}
              
              {/* Progress */}
              <div className="text-sm text-gray-600">
                <span className="font-medium text-green-600">{answeredCount}</span> / {totalQuestions} answered
              </div>
              
              {/* Violations */}
              {violations > 0 && (
                <div className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">{violations}/3 violations</span>
                </div>
              )}
              
              {/* Timer */}
              <ExamTimer
                initialTime={timeRemaining}
                onTimeUpdate={handleTimeUpdate}
                onTimeExpired={handleTimeExpired}
                onWarning={handleTimerWarning}
                warningThresholds={{ warning: 300, critical: 60 }}
                syncInterval={30000}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <QuestionNavigation
              questions={questions}
              currentQuestionIndex={currentQuestionIndex}
              answers={answers}
              onQuestionSelect={goToQuestion}
              onSubmitExam={handleSubmitExam}
              submitting={submitting}
            />
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            {currentQuestion && (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Question {currentQuestionIndex + 1}
                    </h2>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">
                        <span>{currentQuestion.points || 1} point{(currentQuestion.points || 1) !== 1 ? 's' : ''}</span>
                      </div>
                      {/* Mobile question list toggle */}
                      <button
                        onClick={() => setShowQuestionList(!showQuestionList)}
                        className="lg:hidden flex items-center text-blue-600 hover:text-blue-700"
                      >
                        {showQuestionList ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="ml-1 text-sm">Questions</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none">
                    <p className="text-gray-800 text-lg leading-relaxed">
                      {currentQuestion.questionText}
                    </p>
                  </div>
                </div>

                {/* Answer Options */}
                <div className="space-y-3 mb-8">
                  {currentQuestion.options?.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                        answers[currentQuestion._id] === index
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion._id}`}
                        value={index}
                        checked={answers[currentQuestion._id] === index}
                        onChange={() => handleAnswerSelect(currentQuestion._id, index)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-3 text-gray-800 flex-1">{option}</span>
                      {answers[currentQuestion._id] === index && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </label>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    onClick={goToPreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">
                      {currentQuestionIndex + 1} of {totalQuestions}
                    </span>
                    
                    {/* Quick submit button for last question */}
                    {currentQuestionIndex === totalQuestions - 1 && (
                      <button
                        onClick={handleSubmitExam}
                        disabled={submitting}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Submit Exam
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={goToNextQuestion}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExamInterface