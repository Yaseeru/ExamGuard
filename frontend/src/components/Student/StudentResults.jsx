import { useState, useEffect } from 'react'
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'

const StudentResults = () => {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedResult, setExpandedResult] = useState(null)
  const [detailedResult, setDetailedResult] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      const response = await api.get('/results/student')
      setResults(response.data.results || [])
    } catch (error) {
      toast.error('Failed to fetch results')
      console.error('Error fetching results:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDetailedResult = async (attemptId) => {
    if (expandedResult === attemptId) {
      setExpandedResult(null)
      setDetailedResult(null)
      return
    }

    setLoadingDetails(true)
    setExpandedResult(attemptId)
    
    try {
      const response = await api.get(`/results/attempt/${attemptId}`)
      setDetailedResult(response.data.result)
    } catch (error) {
      toast.error('Failed to fetch detailed results')
      console.error('Error fetching detailed results:', error)
      setExpandedResult(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading results...</span>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="card text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
        <p className="text-gray-600">
          Complete an exam to see your results here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">My Exam Results</h2>
        <span className="text-sm text-gray-600">{results.length} exam(s) completed</span>
      </div>

      <div className="space-y-4">
        {results.map(result => (
          <div key={result.attemptId} className="card">
            {/* Result Summary */}
            <div 
              className="cursor-pointer"
              onClick={() => fetchDetailedResult(result.attemptId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{result.exam.title}</h3>
                  <p className="text-sm text-gray-600">{result.exam.course}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(result.submittedAt).toLocaleDateString()}
                    </span>
                    <span>
                      {result.answeredQuestions}/{result.totalQuestions} answered
                    </span>
                    {result.violationCount > 0 && (
                      <span className="flex items-center text-orange-600">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {result.violationCount} violation(s)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${
                      result.percentage >= 70 ? 'text-green-600' :
                      result.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {result.percentage}%
                    </div>
                    <p className="text-sm text-gray-600">
                      {result.score}/{result.exam.totalPoints} points
                    </p>
                  </div>

                  {expandedResult === result.attemptId ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            {expandedResult === result.attemptId && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading details...</span>
                  </div>
                ) : detailedResult ? (
                  <DetailedResults result={detailedResult} />
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const DetailedResults = ({ result }) => {
  // Create a map of student answers
  const answerMap = {}
  result.answers.forEach(answer => {
    answerMap[answer.questionId] = answer.selectedOption
  })

  // Get questions from the exam
  const questions = result.exam?.questions || []

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Correct Answers</p>
              <p className="text-xl font-bold text-green-600">
                {result.answers.filter(a => {
                  const question = questions.find(q => q._id === a.questionId)
                  return question && a.selectedOption === question.correctAnswer
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <XCircle className="h-6 w-6 text-red-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Wrong Answers</p>
              <p className="text-xl font-bold text-red-600">
                {result.answers.filter(a => {
                  const question = questions.find(q => q._id === a.questionId)
                  return question && a.selectedOption !== question.correctAnswer
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-gray-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Unanswered</p>
              <p className="text-xl font-bold text-gray-600">
                {result.totalQuestions - result.answers.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Question-by-Question Breakdown */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Question Breakdown</h4>
        <div className="space-y-4">
          {questions.map((question, index) => {
            const studentAnswer = answerMap[question._id]
            const isCorrect = studentAnswer === question.correctAnswer
            const isAnswered = studentAnswer !== undefined

            return (
              <div 
                key={question._id} 
                className={`p-4 rounded-lg border-2 ${
                  !isAnswered ? 'border-gray-200 bg-gray-50' :
                  isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {!isAnswered ? (
                      <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs text-gray-600">-</span>
                      </div>
                    ) : isCorrect ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-3">
                      {index + 1}. {question.questionText}
                    </p>

                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => {
                        const optionLetter = String.fromCharCode(65 + optIndex)
                        const isStudentAnswer = studentAnswer === optionLetter
                        const isCorrectAnswer = question.correctAnswer === optionLetter

                        return (
                          <div 
                            key={optIndex}
                            className={`p-3 rounded-lg ${
                              isCorrectAnswer ? 'bg-green-100 border-2 border-green-400' :
                              isStudentAnswer ? 'bg-red-100 border-2 border-red-400' :
                              'bg-white border border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm">
                                <span className="font-semibold">{optionLetter}.</span> {option}
                              </span>
                              <div className="flex items-center gap-2">
                                {isCorrectAnswer && (
                                  <span className="text-xs font-medium text-green-700 bg-green-200 px-2 py-1 rounded">
                                    Correct Answer
                                  </span>
                                )}
                                {isStudentAnswer && !isCorrectAnswer && (
                                  <span className="text-xs font-medium text-red-700 bg-red-200 px-2 py-1 rounded">
                                    Your Answer
                                  </span>
                                )}
                                {isStudentAnswer && isCorrectAnswer && (
                                  <span className="text-xs font-medium text-green-700 bg-green-200 px-2 py-1 rounded">
                                    Your Answer ✓
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {!isAnswered && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        You did not answer this question
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default StudentResults
