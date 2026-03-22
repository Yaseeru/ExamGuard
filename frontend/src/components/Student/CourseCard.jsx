import { useState } from 'react'
import { Users, BookOpen, Calendar, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'

const CourseCard = ({ course, isEnrolled = false, onEnrollmentChange }) => {
  const [loading, setLoading] = useState(false)

  const handleEnrollment = async () => {
    setLoading(true)
    try {
      if (isEnrolled) {
        // Unenroll from course
        await api.delete(`/courses/${course._id}/unenroll`)
        toast.success('Successfully unenrolled from course')
        onEnrollmentChange?.(course._id, false)
      } else {
        // Enroll in course
        await api.post(`/courses/${course._id}/enroll`)
        toast.success('Successfully enrolled in course')
        onEnrollmentChange?.(course._id, true)
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to update enrollment'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const isCapacityFull = course.enrolledStudents?.length >= course.capacity

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {course.title}
          </h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {course.description}
          </p>
        </div>
        {isEnrolled && (
          <CheckCircle className="h-5 w-5 text-green-500 ml-2 flex-shrink-0" />
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>
              {course.enrolledStudents?.length || 0}/{course.capacity}
            </span>
          </div>
          <div className="flex items-center">
            <BookOpen className="h-4 w-4 mr-1" />
            <span>Course</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>
              {new Date(course.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-gray-500">Instructor: </span>
          <span className="font-medium text-gray-900">
            {course.lecturerId?.name || 'Unknown'}
          </span>
        </div>

        <button
          onClick={handleEnrollment}
          disabled={loading || (!isEnrolled && isCapacityFull)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isEnrolled
              ? 'bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50'
              : isCapacityFull
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50'
          }`}
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              {isEnrolled ? 'Unenrolling...' : 'Enrolling...'}
            </div>
          ) : isEnrolled ? (
            'Unenroll'
          ) : isCapacityFull ? (
            <div className="flex items-center">
              <XCircle className="h-4 w-4 mr-1" />
              Full
            </div>
          ) : (
            'Enroll'
          )}
        </button>
      </div>
    </div>
  )
}

export default CourseCard