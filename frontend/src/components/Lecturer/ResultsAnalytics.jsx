import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { BarChart3, Users, AlertTriangle, FileText, Calendar, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'

const ResultsAnalytics = () => {
  const [searchParams] = useSearchParams()
  const [results, setResults] = useState([])
  const [courses, setCourses] = useState([])
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState(searchParams.get('courseId') || '')
  const [selectedExam, setSelectedExam] = useState(searchParams.get('examId') || '')
  const [statistics, setStatistics] = useState({
    totalAttempts: 0,
    averageScore: 0,
    completionRate: 0,
    violationCount: 0
  })

  useEffect(() => {
    fetchCourses()
    fetchResults()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      fetchExamsByCourse(selectedCourse)
    } else {
      setExams([])
      setSelectedExam('')
    }
  }, [selectedCourse])

  useEffect(() => {
    fetchResults()
  }, [selectedCourse, selectedExam])

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses')
      setCourses(response.data.courses || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchExamsByCourse = async (courseId) => {
    try {
      const response = await api.get(`/exams?courseId=${courseId}`)
      setExams(response.data.exams || [])
    } catch (error) {
      console.error('Error fetching exams:', error)
    }
  }

  const fetchResults = async () => {
    setLoading(true)
    try {
      let response;
      
      if (selectedExam) {
        // Get results for specific exam
        response = await api.get(`/results/exam/${selectedExam}`)
        const examData = response.data
        
        // Format the response to match expected structure
        setResults(examData.results || [])
        
        // Use exam statistics if available
        if (examData.statistics) {
          setStatistics({
            totalAttempts: examData.statistics.totalAttempts || 0,
            averageScore: examData.statistics.averagePercentage || 0,
            completionRate: examData.statistics.totalAttempts > 0 
              ? ((examData.statistics.totalAttempts - (examData.statistics.autoSubmittedCount || 0)) / examData.statistics.totalAttempts) * 100 
              : 0,
            violationCount: examData.statistics.totalViolations || 0
          })
        }
      } else {
        // Get all results for lecturer
        response = await api.get('/results/lecturer')
        const summary = response.data.summary || []
        
        // Filter by course if selected
        let filteredSummary = summary
        if (selectedCourse) {
          filteredSummary = summary.filter(exam => {
            const course = courses.find(c => c.title === exam.course)
            return course && course._id === selectedCourse
          })
        }
        
        // Calculate aggregate statistics
        const totalAttempts = filteredSummary.reduce((sum, exam) => sum + exam.totalAttempts, 0)
        const totalViolations = filteredSummary.reduce((sum, exam) => sum + exam.totalViolations, 0)
        const avgScore = filteredSummary.length > 0
          ? filteredSummary.reduce((sum, exam) => sum + exam.averagePercentage, 0) / filteredSummary.length
          : 0
        
        setStatistics({
          totalAttempts,
          averageScore: avgScore,
          completionRate: 100, // Summary only shows completed attempts
          violationCount: totalViolations
        })
        
        // Convert summary to results format for display
        // We need to fetch individual exam attempts
        if (filteredSummary.length > 0) {
          const allResults = []
          for (const examSummary of filteredSummary) {
            try {
              const examResponse = await api.get(`/results/exam/${examSummary.examId}`)
              allResults.push(...(examResponse.data.results || []))
            } catch (error) {
              console.error(`Error fetching results for exam ${examSummary.examId}:`, error)
            }
          }
          setResults(allResults)
        } else {
          setResults([])
        }
      }
    } catch (error) {
      console.error('Error fetching results:', error)
      toast.error('Failed to load results')
      setResults([])
    } finally {
      setLoading(false)
    }
  }
  const handleCourseFilter = (courseId) => {
    setSelectedCourse(courseId)
    setSelectedExam('')
  }

  const handleExamFilter = (examId) => {
    setSelectedExam(examId)
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'submitted': { color: 'bg-green-100 text-green-800', text: 'Completed' },
      'auto_submitted': { color: 'bg-orange-100 text-orange-800', text: 'Auto-Submitted' },
      'in_progress': { color: 'bg-blue-100 text-blue-800', text: 'In Progress' },
      'expired': { color: 'bg-gray-100 text-gray-800', text: 'Expired' }
    }
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Results & Analytics</h2>
        <p className="text-sm sm:text-base text-gray-600">View exam results and student performance analytics</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="courseFilter" className="block text-sm font-medium text-gray-700 mb-2">Filter by Course</label>
            <select
              id="courseFilter"
              value={selectedCourse}
              onChange={(e) => handleCourseFilter(e.target.value)}
              className="input-field text-sm sm:text-base"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="examFilter" className="block text-sm font-medium text-gray-700 mb-2">Filter by Exam</label>
            <select
              id="examFilter"
              value={selectedExam}
              onChange={(e) => handleExamFilter(e.target.value)}
              className="input-field text-sm sm:text-base"
              disabled={!selectedCourse}
            >
              <option value="">All Exams</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex-shrink-0 mb-2 sm:mb-0">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
            <div className="sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Attempts</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{statistics.totalAttempts}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex-shrink-0 mb-2 sm:mb-0">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
            <div className="sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {statistics.averageScore.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex-shrink-0 mb-2 sm:mb-0">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            </div>
            <div className="sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {statistics.completionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex-shrink-0 mb-2 sm:mb-0">
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            </div>
            <div className="sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Violations</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{statistics.violationCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Exam Results</h3>
          {results.length > 0 && (
            <p className="text-xs sm:text-sm text-gray-600">
              Showing {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">
              {selectedCourse || selectedExam 
                ? 'No exam attempts found for the selected filters' 
                : 'No exam attempts have been made yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Exam
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Violations
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((result) => (
                      <tr key={result.attemptId || result._id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {result.student?.name || result.studentId?.name || 'Unknown Student'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {result.student?.email || result.studentId?.email || 'No email'}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {result.exam?.title || result.examId?.title || 'Unknown Exam'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {result.exam?.course || result.examId?.courseId?.title || 'Unknown Course'}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className={`text-xs sm:text-sm font-medium ${getScoreColor(result.percentage || result.score || 0)}`}>
                            {result.percentage !== undefined ? `${result.percentage}%` : result.score !== undefined ? `${result.score.toFixed(1)}%` : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {result.answeredQuestions !== undefined && result.totalQuestions ? `${result.answeredQuestions}/${result.totalQuestions}` : result.answers?.length && result.totalQuestions ? `${result.answers.length}/${result.totalQuestions}` : 'N/A'}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(result.status)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className={`text-xs sm:text-sm font-medium ${result.violationCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {result.violationCount || 0}
                          </div>
                          {result.violationCount > 0 && (
                            <div className="text-xs text-gray-500">violations</div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {result.submittedAt ? (
                            <div>
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(result.submittedAt).toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(result.submittedAt).toLocaleTimeString()}
                              </div>
                            </div>
                          ) : (
                            'Not submitted'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultsAnalytics