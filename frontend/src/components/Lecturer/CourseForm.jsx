import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'

const CourseForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    capacity: ''
  })
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditing)

  useEffect(() => {
    if (isEditing) {
      fetchCourse()
    }
  }, [id, isEditing])

  const fetchCourse = async () => {
    try {
      const response = await api.get(`/courses/${id}`)
      const course = response.data.course
      setFormData({
        title: course.title,
        description: course.description,
        capacity: course.capacity.toString()
      })
    } catch (error) {
      console.error('Error fetching course:', error)
      toast.error('Failed to load course details')
      navigate('/lecturer/courses')
    } finally {
      setInitialLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        capacity: parseInt(formData.capacity)
      }

      if (isEditing) {
        await api.put(`/courses/${id}`, payload)
        toast.success('Course updated successfully')
      } else {
        await api.post('/courses', payload)
        toast.success('Course created successfully')
      }

      navigate('/lecturer/courses')
    } catch (error) {
      console.error('Error saving course:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          `Failed to ${isEditing ? 'update' : 'create'} course`
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          to="/lecturer/courses"
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Course' : 'Create New Course'}
          </h2>
          <p className="text-gray-600">
            {isEditing ? 'Update course information' : 'Fill in the details to create a new course'}
          </p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Course Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              minLength={3}
              maxLength={100}
              className="input-field"
              placeholder="Enter course title"
            />
            <p className="text-xs text-gray-500 mt-1">
              3-100 characters, letters, numbers, and spaces only
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Course Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              minLength={10}
              maxLength={500}
              rows={4}
              className="input-field resize-none"
              placeholder="Describe what this course covers"
            />
            <p className="text-xs text-gray-500 mt-1">
              10-500 characters ({formData.description.length}/500)
            </p>
          </div>

          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
              Student Capacity *
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleInputChange}
              required
              min={1}
              max={1000}
              className="input-field"
              placeholder="Maximum number of students"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of students that can enroll (1-1000)
            </p>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              to="/lecturer/courses"
              className="btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex items-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CourseForm