import { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { BookOpen, Users, Edit, Trash2, Plus, Eye } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'
import CourseForm from './CourseForm'
import CourseDetails from './CourseDetails'

const CourseManagement = () => {
  return (
    <Routes>
      <Route path="/" element={<CourseList />} />
      <Route path="/new" element={<CourseForm />} />
      <Route path="/:id/edit" element={<CourseForm />} />
      <Route path="/:id" element={<CourseDetails />} />
    </Routes>
  )
}

const CourseList = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses')
      setCourses(response.data.courses || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCourse = async (courseId, courseName) => {
    if (!window.confirm(`Are you sure you want to delete "${courseName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/courses/${courseId}`)
      toast.success('Course deleted successfully')
      fetchCourses() // Refresh the list
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
          <p className="text-gray-600">Manage your courses and student enrollments</p>
        </div>
        <Link to="/lecturer/courses/new" className="btn-primary inline-flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Create Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first course</p>
          <Link to="/lecturer/courses/new" className="btn-primary inline-flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Course
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard
              key={course._id}
              course={course}
              onDelete={handleDeleteCourse}
              onEdit={(id) => navigate(`/lecturer/courses/${id}/edit`)}
              onView={(id) => navigate(`/lecturer/courses/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const CourseCard = ({ course, onDelete, onEdit, onView }) => {
  const enrollmentPercentage = course.capacity > 0 ? (course.enrolledStudents?.length || 0) / course.capacity * 100 : 0

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{course.description}</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Users className="h-4 w-4 mr-2" />
          <span>{course.enrolledStudents?.length || 0} / {course.capacity} students</span>
        </div>
        
        {/* Enrollment Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(enrollmentPercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={() => onView(course._id)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
        >
          <Eye className="h-4 w-4 mr-1" />
          View Details
        </button>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(course._id)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit course"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(course._id, course.title)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete course"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CourseManagement