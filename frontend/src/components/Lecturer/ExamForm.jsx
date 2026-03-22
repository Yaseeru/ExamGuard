import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, Clock, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../utils/api'

const ExamForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEditing = !!id
  const preselectedCourseId = searchParams.get('courseId')

  const [formData, setFormData] = useState({
    title: '',
    courseId: preselectedCourseId || '',
    duration: '',
    startTime: '',
    endTime: '',
    questions: [
      {
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 1
      }
    ]
  })
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditing)

  useEffect(() => {
    fetchCourses()
    if (isEditing) {
      fetchExam()
    }
  }, [id, isEditing])

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses')
      setCourses(response.data.courses || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Failed to load courses')
    }
  }

  const fetchExam = async () => {
    try {
      const response = await api.get(`/exams/${id}`)
      const exam = response.data.exam
      setFormData({
        title: exam.title,
        courseId: exam.courseId._id || exam.courseId, // Extract ID if courseId is populated
        duration: exam.duration.toString(),
        startTime: new Date(exam.startTime).toISOString().slice(0, 16),
        endTime: new Date(exam.endTime).toISOString().slice(0, 16),
        questions: exam.questions || []
      })
    } catch (error) {
      console.error('Error fetching exam:', error)
      toast.error('Failed to load exam details')
      navigate('/lecturer/exams')
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

  const handleQuestionChange = (questionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, index) =>
        index === questionIndex ? { ...question, [field]: value } : question
      )
    }))
  }

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, oIndex) =>
                oIndex === optionIndex ? value : option
              )
            }
          : question
      )
    }))
  }

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          points: 1
        }
      ]
    }))
  }

  const removeQuestion = (questionIndex) => {
    if (formData.questions.length <= 1) {
      toast.error('Exam must have at least one question')
      return
    }
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, index) => index !== questionIndex)
    }))
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    console.log('Form submitted!') // Debug log
    console.log('Form data:', formData) // Debug log
    
    setLoading(true)

    try {
      // Validate questions
      const invalidQuestions = formData.questions.filter(q => 
        !q.questionText.trim() || q.options.some(opt => !opt.trim())
      )
      
      if (invalidQuestions.length > 0) {
        toast.error('All questions must have text and all options must be filled')
        setLoading(false)
        return
      }

      const payload = {
        title: formData.title.trim(),
        courseId: formData.courseId,
        duration: parseInt(formData.duration),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        questions: formData.questions.map(q => ({
          questionText: q.questionText.trim(),
          options: q.options.map(opt => opt.trim()),
          correctAnswer: parseInt(q.correctAnswer),
          points: parseInt(q.points) || 1
        }))
      }

      console.log('Payload to send:', payload) // Debug log

      if (isEditing) {
        const response = await api.put(`/exams/${id}`, payload)
        console.log('Update response:', response) // Debug log
        toast.success('Exam updated successfully')
      } else {
        const response = await api.post('/exams', payload)
        console.log('Create response:', response) // Debug log
        toast.success('Exam created successfully')
      }

      navigate('/lecturer/exams')
    } catch (error) {
      console.error('Error saving exam:', error) // Debug log
      console.error('Error response:', error.response) // Debug log
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message ||
                          `Failed to ${isEditing ? 'update' : 'create'} exam`
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          to="/lecturer/exams"
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Exam' : 'Create New Exam'}
          </h2>
          <p className="text-gray-600">
            {isEditing ? 'Update exam information and questions' : 'Set up a new examination'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Exam Title *
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
                placeholder="Enter exam title"
              />
            </div>

            <div>
              <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-2">
                Course *
              </label>
              <select
                id="courseId"
                name="courseId"
                value={formData.courseId}
                onChange={handleInputChange}
                required
                className="input-field"
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes) *
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                required
                min={5}
                max={300}
                className="input-field"
                placeholder="60"
              />
            </div>

            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <input
                type="datetime-local"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                End Time *
              </label>
              <input
                type="datetime-local"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                required
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Questions</h3>
            <button
              type="button"
              onClick={addQuestion}
              className="btn-secondary inline-flex items-center text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </button>
          </div>
          <div className="space-y-6">
            {formData.questions.map((question, questionIndex) => (
              <div key={questionIndex} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-medium text-gray-900">Question {questionIndex + 1}</h4>
                  {formData.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(questionIndex)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor={`question-${questionIndex}`} className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text *
                    </label>
                    <textarea
                      id={`question-${questionIndex}`}
                      value={question.questionText}
                      onChange={(e) => handleQuestionChange(questionIndex, 'questionText', e.target.value)}
                      required
                      minLength={10}
                      rows={3}
                      className="input-field resize-none"
                      placeholder="Enter your question here..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex}>
                        <label htmlFor={`option-${questionIndex}-${optionIndex}`} className="block text-sm font-medium text-gray-700 mb-2">
                          Option {String.fromCharCode(65 + optionIndex)} *
                        </label>
                        <input
                          id={`option-${questionIndex}-${optionIndex}`}
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                          required
                          className="input-field"
                          placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Correct Answer *
                      </label>
                      <select
                        value={question.correctAnswer}
                        onChange={(e) => handleQuestionChange(questionIndex, 'correctAnswer', parseInt(e.target.value))}
                        required
                        className="input-field"
                      >
                        {question.options.map((_, optionIndex) => (
                          <option key={optionIndex} value={optionIndex}>
                            Option {String.fromCharCode(65 + optionIndex)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Points
                      </label>
                      <input
                        type="number"
                        value={question.points}
                        onChange={(e) => handleQuestionChange(questionIndex, 'points', parseInt(e.target.value) || 1)}
                        min={1}
                        max={10}
                        className="input-field"
                        placeholder="1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <Link
            to="/lecturer/exams"
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
            {isEditing ? 'Update Exam' : 'Create Exam'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ExamForm