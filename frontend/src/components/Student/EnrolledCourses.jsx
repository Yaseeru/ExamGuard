import { useState, useEffect } from 'react'
import { BookOpen, Users, Calendar, FileText, TrendingUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'
import CourseCard from './CourseCard'

const EnrolledCourses = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [courseStats, setCourseStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEnrolledCourses()
  }, [])

  const fetchEnrolledCourses = async () => {
    try {
      const response = await api.get('/courses/enrolled')
      const courses = response.data.courses || []
      setEnrolledCourses(courses)
      
      // Fetch stats for each course
      const stats = {}
      for (const course of courses) {
        try {
          const examsResponse = await api.get(`/exams?courseId=${course._id}`)
          const exams = examsResponse.data.exams || []
          
          const attemptsResponse = await api.get('/exam-attempts')
          const attempts = attemptsResponse.data.attempts || []
          
          const courseAttempts = attempts.filter(attempt => 
            exams.some(exam => exam._id === attempt.examId._id)
          )
          
          stats[course._id] = {
            totalExams: exams.length,
            availableExams: exams.filter(exam => exam.isAvailable && !exam.hasAttempt).length,
            completedExams: courseAttempts.filter(attempt => 
              attempt.status === 'submitted' || attempt.status === 'auto_submitted'
            ).length,
            averageScore: courseAttempts.length > 0 
              ? Math.round(courseAttempts.reduce((sum, attempt) => 
                  sum + (attempt.score || 0), 0) / courseAttempts.length)
              : 0
          }
        } catch (error) {
          console.error(`Error fetching stats for course ${course._id}:`, error)
          stats[course._id] = {
            totalExams: 0,
            availableExams: 0,
            completedExams: 0,
            averageScore: 0
          }
        }
      }
      setCourseStats(stats)
    } catch (error) {
      toast.error('Failed to fetch enrolled courses')
      console.error('Error fetching enrolled courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnenrollment = (courseId) => {
    setEnrolledCourses(prev => prev.filter(course => course._id !== courseId))
    setCourseStats(prev => {
      const newStats = { ...prev }
      delete newStats[courseId]
      return newStats
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading enrolled courses...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
          <p className="text-gray-600 mt-1">
            Courses you are currently enrolled in
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-sm text-gray-500">
          <BookOpen className="h-4 w-4" />
          <span>{enrolledCourses.length} enrolled courses</span>
        </div>
      </div>

      {/* Course Grid */}
      {enrolledCourses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No enrolled courses
          </h3>
          <p className="text-gray-600 mb-4">
            You haven't enrolled in any courses yet. Browse available courses to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {enrolledCourses.map(course => {
            const stats = courseStats[course._id] || {}
            
            return (
              <div key={course._id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {course.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {course.description}
                    </p>
                  </div>
                </div>

                {/* Course Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Exams</p>
                        <p className="text-2xl font-bold text-blue-700">{stats.totalExams || 0}</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Available</p>
                        <p className="text-2xl font-bold text-green-700">{stats.availableExams || 0}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Completed</p>
                        <p className="text-2xl font-bold text-purple-700">{stats.completedExams || 0}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">Avg Score</p>
                        <p className="text-2xl font-bold text-orange-700">{stats.averageScore || 0}%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-orange-500" />
                    </div>
                  </div>
                </div>

                {/* Course Info */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      <span>
                        {course.enrolledStudents?.length || 0}/{course.capacity}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>
                        Enrolled {new Date(course.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm">
                    <span className="text-gray-500">Instructor: </span>
                    <span className="font-medium text-gray-900">
                      {course.lecturerId?.name || 'Unknown'}
                    </span>
                  </div>

                  <CourseCard
                    course={course}
                    isEnrolled={true}
                    onEnrollmentChange={(courseId, isEnrolled) => {
                      if (!isEnrolled) {
                        handleUnenrollment(courseId)
                      }
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Overall Stats */}
      {enrolledCourses.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Progress</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {enrolledCourses.length}
              </div>
              <div className="text-sm text-gray-600">Enrolled Courses</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Object.values(courseStats).reduce((sum, stats) => sum + (stats.totalExams || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Exams</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(courseStats).reduce((sum, stats) => sum + (stats.completedExams || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Object.values(courseStats).length > 0
                  ? Math.round(Object.values(courseStats).reduce((sum, stats) => sum + (stats.averageScore || 0), 0) / Object.values(courseStats).length)
                  : 0
                }%
              </div>
              <div className="text-sm text-gray-600">Overall Average</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnrolledCourses