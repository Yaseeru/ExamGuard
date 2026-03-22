import { useState, useEffect } from 'react'
import { Search, Filter, BookOpen, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'
import CourseCard from './CourseCard'

const CourseBrowser = () => {
  const [courses, setCourses] = useState([])
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all') // all, available, full

  useEffect(() => {
    fetchCourses()
    fetchEnrolledCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses')
      setCourses(response.data.courses || [])
    } catch (error) {
      toast.error('Failed to fetch courses')
      console.error('Error fetching courses:', error)
    }
  }

  const fetchEnrolledCourses = async () => {
    try {
      const response = await api.get('/courses/enrolled')
      setEnrolledCourses(response.data.courses || [])
    } catch (error) {
      console.error('Error fetching enrolled courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnrollmentChange = (courseId, isEnrolled) => {
    if (isEnrolled) {
      // Add to enrolled courses
      const course = courses.find(c => c._id === courseId)
      if (course) {
        setEnrolledCourses(prev => [...prev, course])
        // Update the course's enrolled count
        setCourses(prev => prev.map(c => 
          c._id === courseId 
            ? { ...c, enrolledStudents: [...(c.enrolledStudents || []), 'current-user'] }
            : c
        ))
      }
    } else {
      // Remove from enrolled courses
      setEnrolledCourses(prev => prev.filter(c => c._id !== courseId))
      // Update the course's enrolled count
      setCourses(prev => prev.map(c => 
        c._id === courseId 
          ? { ...c, enrolledStudents: (c.enrolledStudents || []).slice(0, -1) }
          : c
      ))
    }
  }

  const isEnrolled = (courseId) => {
    return enrolledCourses.some(course => course._id === courseId)
  }

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false

    switch (filterBy) {
      case 'available':
        return (course.enrolledStudents?.length || 0) < course.capacity
      case 'full':
        return (course.enrolledStudents?.length || 0) >= course.capacity
      default:
        return true
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading courses...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Browse Courses</h2>
          <p className="text-gray-600 mt-1">
            Discover and enroll in available courses
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-sm text-gray-500">
          <BookOpen className="h-4 w-4" />
          <span>{courses.length} courses available</span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Courses</option>
            <option value="available">Available</option>
            <option value="full">Full</option>
          </select>
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterBy !== 'all' ? 'No courses found' : 'No courses available'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || filterBy !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Check back later for new courses'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <CourseCard
              key={course._id}
              course={course}
              isEnrolled={isEnrolled(course._id)}
              onEnrollmentChange={handleEnrollmentChange}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {courses.length}
            </div>
            <div className="text-sm text-gray-600">Total Courses</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {enrolledCourses.length}
            </div>
            <div className="text-sm text-gray-600">Enrolled</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {courses.filter(c => (c.enrolledStudents?.length || 0) < c.capacity).length}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseBrowser