import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { X, User, Mail, Lock, Shield } from 'lucide-react'
import api from '../../utils/api'
import { FormField, LoadingButton, ErrorMessage } from '../Common'
import useFormValidation from '../../hooks/useFormValidation'
import useErrorHandler from '../../hooks/useErrorHandler'

const UserForm = ({ onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const isEditing = false // Always creating new users

  // Reset loading state when component mounts
  useEffect(() => {
    setLoading(false)
    setSubmitError(null)
  }, [])

  const { handleError, clearError } = useErrorHandler({
    showToast: false, // We'll handle toasts manually
    logErrors: true
  })

  const validationRules = {
    name: {
      required: 'Name is required',
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s.]+$/,
      patternMessage: 'Name can only contain letters, spaces, and periods'
    },
    email: {
      required: 'Email is required',
      email: true
    },
    password: {
      required: 'Password is required',
      minLength: 8,
      validate: (value) => {
        if (!value) return 'Password is required'
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value)) {
          return 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        }
        return true
      }
    },
    role: {
      required: 'Please select a role',
      validate: (value) => {
        if (!['Admin', 'Lecturer', 'Student'].includes(value)) {
          return 'Please select a valid role'
        }
        return true
      }
    }
  }

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    isValid,
    isSubmitting: formSubmitting
  } = useFormValidation(
    {
      name: '',
      email: '',
      password: '',
      role: 'Student'
    },
    validationRules,
    {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 300
    }
  )

  useEffect(() => {
    // Auto-validate when all required fields are filled
    const { name, email, password, role } = values
    const allRequiredFilled = name && email && role && password
    
    if (allRequiredFilled && Object.keys(errors).length === 0 && Object.keys(touched).length === 0) {
      // Trigger validation for all fields
      Object.keys(values).forEach(fieldName => {
        handleBlur(fieldName)
      })
    }
  }, [values, errors, touched, handleBlur])

  const onSubmit = async (formData) => {
    setLoading(true)
    setSubmitError(null)
    clearError('submit')

    try {
      const submitData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role
      }

      // Only include password if it's provided
      if (formData.password) {
        submitData.password = formData.password
      }

      await api.post('/users', submitData)
      toast.success('User created successfully')

      onSave()
    } catch (error) {
      const errorInfo = await handleError(error, 'submit')
      setSubmitError(errorInfo.message)
      
      // Show specific error toast
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to create user'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    await handleSubmit(onSubmit)
  }

  // Simple validation check
  const canSubmit = () => {
    const { name, email, password, role } = values
    return name.trim() && email.trim() && password.trim() && role && !loading
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="user-form-title" className="text-xl font-semibold text-gray-900">
            Create New User
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Close dialog"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4" noValidate>
          {/* Submit Error */}
          {submitError && (
            <ErrorMessage
              variant="error"
              title="Submission Failed"
              message={submitError}
              onDismiss={() => setSubmitError(null)}
            />
          )}

          {/* Name Field */}
          <FormField
            label="Full Name"
            name="name"
            type="text"
            placeholder="Enter full name"
            value={values.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            error={errors.name}
            required
            disabled={loading}
            icon={User}
            autoComplete="name"
          />

          {/* Email Field */}
          <FormField
            label="Email Address"
            name="email"
            type="email"
            placeholder="Enter email address"
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            error={errors.email}
            required
            disabled={loading}
            icon={Mail}
            autoComplete="email"
          />

          {/* Password Field */}
          <FormField
            label="Password"
            name="password"
            type="password"
            placeholder="Enter password"
            value={values.password}
            onChange={(e) => handleChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
            error={errors.password}
            required
            disabled={loading}
            icon={Lock}
            showPasswordToggle
            autoComplete="new-password"
            helpText="Must contain at least 8 characters with uppercase, lowercase, and number"
          />

          {/* Role Field */}
          <div className="form-group">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
              <span className="text-red-500 ml-1" aria-label="required">*</span>
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
              <select
                id="role"
                name="role"
                value={values.role}
                onChange={(e) => handleChange('role', e.target.value)}
                onBlur={() => handleBlur('role')}
                className={`input pl-10 appearance-none ${errors.role ? 'input-error' : ''}`}
                disabled={loading}
                required
                aria-invalid={!!errors.role}
                aria-describedby={errors.role ? 'role-error' : 'role-help'}
              >
                <option value="Student">Student</option>
                <option value="Lecturer">Lecturer</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            {errors.role && (
              <div id="role-error" className="mt-1 text-sm text-red-600 flex items-center" role="alert">
                <Shield className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
                {errors.role}
              </div>
            )}
            <div id="role-help" className="mt-1 text-xs text-gray-500">
              <div className="space-y-1">
                <div><strong>Student:</strong> Can enroll in courses and take exams</div>
                <div><strong>Lecturer:</strong> Can create courses and manage exams</div>
                <div><strong>Admin:</strong> Can manage all users and system settings</div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              disabled={!canSubmit()}
              className="flex-1"
              variant="primary"
              loadingText="Creating..."
            >
              Create User
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserForm