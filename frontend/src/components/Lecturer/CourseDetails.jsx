import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Users, FileText, Calendar, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'

const CourseDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourseDetails()
    fetchCourseExams()
  }, [id])

  const fetchCourseDetails = async () => {
    try {
      const response = await api.get(`/courses/${id}`)
      setCourse(response.data.course)
    } catch (error) {
      console.error('Error fetching course details:', error)
      toast.error('Failed to load course details')
      navigate('/lecturer/courses')
    }
  }

  const fetchCourseExams = async () => {
    try {
      const response = await api.get(`/exams?courseId=${id}`)
      setExams(response.data.exams || [])
    } catch (error) {
      console.error('Error fetching course exams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCourse = async () => {
    if (!window.confirm(`Are you sure you want to delete "${course.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/courses/${id}`)
      toast.success('Course deleted successfully')
      navigate('/lecturer/courses')
    } catch (error) {
      console.error('Error deleting course:', error)
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete course'
      toast.error(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Course not found</p>
        <Link to="/lecturer/courses" className="btn-primary mt-4">
          Back to Courses
        </Link>
      </div>
    )
  }

  const enrollmentPercentage = course.capacity > 0 ? (course.enrolledStudents?.length || 0) / course.capacity * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/lecturer/courses"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{course.title}</h2>
            <p className="text-gray-600">Course Details & Management</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Link
            to={`/lecturer/courses/${id}/edit`}
            className="btn-secondary inline-flex items-center"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Course
          </Link>
          <button
            onClick={handleDeleteCourse}
            className="btn-danger inline-flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Course
          </button>
        </div>
      </div>

      {/* Course Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <p className="text-gray-900">{course.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-gray-900">{course.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <p className="text-gray-900">{course.capacity} students</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p className="text-gray-900">
                    {new Date(course.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Exams Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Course Exams</h3>
              <Link
                to={`/lecturer/exams/new?courseId=${id}`}
                className="btn-primary text-sm"
              >
                Create Exam
              </Link>
            </div>
            
            {exams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No exams created yet</p>
                <p className="text-sm">Create your first exam for this course</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exams.map((exam) => (
                  <div key={exam._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{exam.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(exam.startTime).toLocaleDateString()}
                          </span>
                          <span>{exam.duration} minutes</span>
                          <span>{exam.questions?.length || 0} questions</span>
                        </div>
                      </div>
                      <Link
                        to={`/lecturer/exams/${exam._id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enrollment Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Students Enrolled</span>
                <span className="font-medium">
                  {course.enrolledStudents?.length || 0} / {course.capacity}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(enrollmentPercentage, 100)}%` }}
                ></div>
              </div>
              
              <p className="text-xs text-gray-500">
                {enrollmentPercentage.toFixed(1)}% capacity filled
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to={`/lecturer/exams/new?courseId=${id}`}
                className="w-full btn-primary text-center inline-flex items-center justify-center"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Exam
              </Link>
              <Link
                to={`/lecturer/results?courseId=${id}`}
                className="w-full btn-secondary text-center inline-flex items-center justify-center"
              >
                <Users className="h-4 w-4 mr-2" />
                View Results
              </Link>
            </div>
          </div>

          {/* Course Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Exams</span>
                <span className="font-medium">{exams.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Exams</span>
                <span className="font-medium">
                  {exams.filter(exam => new Date(exam.endTime) > new Date()).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completed Exams</span>
                <span className="font-medium">
                  {exams.filter(exam => new Date(exam.endTime) <= new Date()).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDetails