import { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Calendar, Clock, Users, Edit, Trash2, Plus, Eye } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'
import ExamForm from './ExamForm'
import ExamDetails from './ExamDetails'

const ExamManagement = () => {
  return (
    <Routes>
      <Route path="/" element={<ExamList />} />
      <Route path="/new" element={<ExamForm />} />
      <Route path="/:id/edit" element={<ExamForm />} />
      <Route path="/:id" element={<ExamDetails />} />
    </Routes>
  )
}

const ExamList = () => {
  const [exams, setExams] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    fetchCourses()
    fetchExams()
  }, [])

  useEffect(() => {
    const courseId = searchParams.get('courseId')
    if (courseId) {
      setSelectedCourse(courseId)
    }
  }, [searchParams])

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses')
      setCourses(response.data.courses || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchExams = async (courseId = '') => {
    try {
      const url = courseId ? `/exams?courseId=${courseId}` : '/exams'
      const response = await api.get(url)
      setExams(response.data.exams || [])
    } catch (error) {
      console.error('Error fetching exams:', error)
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }
  const handleCourseFilter = (courseId) => {
    setSelectedCourse(courseId)
    setLoading(true)
    fetchExams(courseId)
  }

  const handleDeleteExam = async (examId, examTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${examTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/exams/${examId}`)
      toast.success('Exam deleted successfully')
      fetchExams(selectedCourse) // Refresh the list
    } catch (error) {
      console.error('Error deleting exam:', error)
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete exam'
      toast.error(errorMessage)
    }
  }

  const getExamStatus = (exam) => {
    const now = new Date()
    const startTime = new Date(exam.startTime)
    const endTime = new Date(exam.endTime)

    if (now < startTime) return { status: 'upcoming', color: 'text-blue-600 bg-blue-100' }
    if (now >= startTime && now <= endTime) return { status: 'active', color: 'text-green-600 bg-green-100' }
    return { status: 'completed', color: 'text-gray-600 bg-gray-100' }
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
          <h2 className="text-2xl font-bold text-gray-900">Exam Management</h2>
          <p className="text-gray-600">Create and manage your examinations</p>
        </div>
        <Link to="/lecturer/exams/new" className="btn-primary inline-flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Create Exam
        </Link>
      </div>
      {/* Course Filter */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Course:</label>
          <select
            value={selectedCourse}
            onChange={(e) => handleCourseFilter(e.target.value)}
            className="input-field max-w-xs"
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedCourse ? 'No exams for this course' : 'No exams yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedCourse 
              ? 'Create your first exam for this course' 
              : 'Get started by creating your first exam'}
          </p>
          <Link to="/lecturer/exams/new" className="btn-primary inline-flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Exam
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <ExamCard
              key={exam._id}
              exam={exam}
              onDelete={handleDeleteExam}
              onEdit={(id) => navigate(`/lecturer/exams/${id}/edit`)}
              onView={(id) => navigate(`/lecturer/exams/${id}`)}
              getExamStatus={getExamStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}
const ExamCard = ({ exam, onDelete, onEdit, onView, getExamStatus }) => {
  const examStatus = getExamStatus(exam)

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{exam.title}</h3>
          <p className="text-gray-600 text-sm">{exam.courseId?.title || 'Unknown Course'}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${examStatus.color}`}>
          {examStatus.status.charAt(0).toUpperCase() + examStatus.status.slice(1)}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{new Date(exam.startTime).toLocaleDateString()}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-2" />
          <span>{exam.duration} minutes</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <FileText className="h-4 w-4 mr-2" />
          <span>{exam.questions?.length || 0} questions</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={() => onView(exam._id)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
        >
          <Eye className="h-4 w-4 mr-1" />
          View Details
        </button>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(exam._id)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit exam"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(exam._id, exam.title)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete exam"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExamManagement