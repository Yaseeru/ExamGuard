import { Send, CheckCircle, Circle } from 'lucide-react'

const QuestionNavigation = ({ 
  questions, 
  currentQuestionIndex, 
  answers, 
  onQuestionSelect, 
  onSubmitExam, 
  submitting = false 
}) => {
  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length

  const getQuestionStatus = (index) => {
    const question = questions[index]
    const isAnswered = answers[question._id] !== undefined
    const isCurrent = index === currentQuestionIndex

    if (isCurrent) {
      return 'current'
    } else if (isAnswered) {
      return 'answered'
    } else {
      return 'unanswered'
    }
  }

  const getQuestionButtonClass = (status) => {
    switch (status) {
      case 'current':
        return 'bg-blue-600 text-white border-blue-600'
      case 'answered':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
      case 'unanswered':
        return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getProgressPercentage = () => {
    return totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Question Navigation</h3>
        <div className="text-sm text-gray-600">
          Progress: {answeredCount} of {totalQuestions} answered
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Question Grid */}
      <div className="grid grid-cols-5 lg:grid-cols-4 gap-2 mb-6">
        {questions.map((question, index) => {
          const status = getQuestionStatus(index)
          return (
            <button
              key={question._id}
              onClick={() => onQuestionSelect(index)}
              className={`relative w-10 h-10 rounded-lg text-sm font-medium border transition-all duration-200 ${getQuestionButtonClass(status)}`}
              title={`Question ${index + 1}${status === 'answered' ? ' (Answered)' : status === 'current' ? ' (Current)' : ''}`}
            >
              {index + 1}
              {status === 'answered' && status !== 'current' && (
                <CheckCircle className="absolute -top-1 -right-1 h-3 w-3 text-green-600 bg-white rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mb-6 text-xs text-gray-600 space-y-2">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-600 rounded mr-2"></div>
          <span>Current question</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2 flex items-center justify-center">
            <CheckCircle className="h-2 w-2 text-green-600" />
          </div>
          <span>Answered</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded mr-2 flex items-center justify-center">
            <Circle className="h-2 w-2 text-gray-400" />
          </div>
          <span>Not answered</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-6 pt-6 border-t border-gray-200">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Answered:</span>
            <span className="font-medium text-green-600">{answeredCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Remaining:</span>
            <span className="font-medium text-orange-600">{totalQuestions - answeredCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total:</span>
            <span className="font-medium text-gray-900">{totalQuestions}</span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={onSubmitExam}
        disabled={submitting}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {submitting ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Submitting...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Send className="h-4 w-4 mr-2" />
            Submit Exam
          </div>
        )}
      </button>

      {/* Warning for incomplete exam */}
      {answeredCount < totalQuestions && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-xs">
            You have {totalQuestions - answeredCount} unanswered question{totalQuestions - answeredCount !== 1 ? 's' : ''}. 
            You can submit anytime, but unanswered questions will be marked as incorrect.
          </p>
        </div>
      )}
    </div>
  )
}

export default QuestionNavigation