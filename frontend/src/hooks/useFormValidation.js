import { useState, useCallback, useEffect, useRef } from 'react'

const useFormValidation = (initialValues = {}, validationRules = {}, options = {}) => {
     const {
          validateOnChange = true,
          validateOnBlur = true,
          debounceMs = 300,
          showSuccessMessages = false
     } = options

     const [values, setValues] = useState(initialValues)
     const [errors, setErrors] = useState({})
     const [successes, setSuccesses] = useState({})
     const [touched, setTouched] = useState({})
     const [isSubmitting, setIsSubmitting] = useState(false)
     const [submitCount, setSubmitCount] = useState(0)
     const [isValidating, setIsValidating] = useState({})

     const debounceTimers = useRef({})
     const asyncValidationControllers = useRef({})

     // Validation function
     const validateField = useCallback(async (name, value, allValues = values) => {
          const rules = validationRules[name]
          if (!rules) return { isValid: true, error: null, success: null }

          // Cancel any pending async validation for this field
          if (asyncValidationControllers.current[name]) {
               asyncValidationControllers.current[name].abort()
          }

          // Required validation
          if (rules.required && (!value || value.toString().trim() === '')) {
               const message = rules.required === true ? `${name} is required` : rules.required
               return { isValid: false, error: message, success: null }
          }

          // Skip other validations if field is empty and not required
          if (!value || value.toString().trim() === '') {
               return { isValid: true, error: null, success: null }
          }

          // Min length validation
          if (rules.minLength && value.length < rules.minLength) {
               return {
                    isValid: false,
                    error: `${name} must be at least ${rules.minLength} characters`,
                    success: null
               }
          }

          // Max length validation
          if (rules.maxLength && value.length > rules.maxLength) {
               return {
                    isValid: false,
                    error: `${name} must be no more than ${rules.maxLength} characters`,
                    success: null
               }
          }

          // Pattern validation
          if (rules.pattern && !rules.pattern.test(value)) {
               return {
                    isValid: false,
                    error: rules.patternMessage || `${name} format is invalid`,
                    success: null
               }
          }

          // Email validation
          if (rules.email) {
               const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
               if (!emailPattern.test(value)) {
                    return {
                         isValid: false,
                         error: 'Please enter a valid email address',
                         success: null
                    }
               }
          }

          // Password strength validation
          if (rules.password) {
               const hasUpperCase = /[A-Z]/.test(value)
               const hasLowerCase = /[a-z]/.test(value)
               const hasNumbers = /\d/.test(value)
               const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value)
               const minLength = value.length >= 8

               if (!minLength) {
                    return {
                         isValid: false,
                         error: 'Password must be at least 8 characters long',
                         success: null
                    }
               }
               if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
                    return {
                         isValid: false,
                         error: 'Password must contain uppercase, lowercase, and numbers',
                         success: null
                    }
               }
          }

          // Custom validation function
          if (rules.validate && typeof rules.validate === 'function') {
               const result = rules.validate(value, allValues)
               if (result !== true && result !== undefined) {
                    return {
                         isValid: false,
                         error: result,
                         success: null
                    }
               }
          }

          // Async validation
          if (rules.asyncValidate && typeof rules.asyncValidate === 'function') {
               try {
                    const controller = new AbortController()
                    asyncValidationControllers.current[name] = controller

                    const result = await rules.asyncValidate(value, allValues, controller.signal)

                    if (result !== true && result !== undefined) {
                         return {
                              isValid: false,
                              error: result,
                              success: null
                         }
                    }
               } catch (error) {
                    if (error.name !== 'AbortError') {
                         return {
                              isValid: false,
                              error: 'Validation failed. Please try again.',
                              success: null
                         }
                    }
               }
          }

          // Success message
          const successMessage = showSuccessMessages && rules.successMessage
               ? rules.successMessage
               : null

          return { isValid: true, error: null, success: successMessage }
     }, [validationRules, values, showSuccessMessages])

     // Validate all fields
     const validateForm = useCallback(async () => {
          const newErrors = {}
          const newSuccesses = {}
          const validationPromises = []

          setIsValidating(prev => {
               const newValidating = {}
               Object.keys(values).forEach(name => {
                    newValidating[name] = true
               })
               return newValidating
          })

          for (const [name, value] of Object.entries(values)) {
               validationPromises.push(
                    validateField(name, value).then(result => ({ name, result }))
               )
          }

          try {
               const results = await Promise.all(validationPromises)

               results.forEach(({ name, result }) => {
                    if (!result.isValid) {
                         newErrors[name] = result.error
                    } else if (result.success) {
                         newSuccesses[name] = result.success
                    }
               })

               setErrors(newErrors)
               setSuccesses(newSuccesses)
               setIsValidating({})

               return Object.keys(newErrors).length === 0
          } catch (error) {
               setIsValidating({})
               throw error
          }
     }, [values, validateField])

     // Handle field change with debouncing
     const handleChange = useCallback((name, value) => {
          setValues(prev => ({ ...prev, [name]: value }))

          // Clear previous success/error when user starts typing
          if (errors[name]) {
               setErrors(prev => ({ ...prev, [name]: undefined }))
          }
          if (successes[name]) {
               setSuccesses(prev => ({ ...prev, [name]: undefined }))
          }

          if (validateOnChange && (touched[name] || submitCount > 0)) {
               // Clear existing debounce timer
               if (debounceTimers.current[name]) {
                    clearTimeout(debounceTimers.current[name])
               }

               // Set validation loading state
               setIsValidating(prev => ({ ...prev, [name]: true }))

               // Debounce validation
               debounceTimers.current[name] = setTimeout(async () => {
                    try {
                         const result = await validateField(name, value)
                         setErrors(prev => ({
                              ...prev,
                              [name]: result.error || undefined
                         }))
                         setSuccesses(prev => ({
                              ...prev,
                              [name]: result.success || undefined
                         }))
                    } catch (error) {
                         console.error('Validation error:', error)
                    } finally {
                         setIsValidating(prev => ({ ...prev, [name]: false }))
                    }
               }, debounceMs)
          }
     }, [validateOnChange, touched, submitCount, validateField, debounceMs, errors, successes])

     // Handle field blur
     const handleBlur = useCallback(async (name) => {
          setTouched(prev => ({ ...prev, [name]: true }))

          if (validateOnBlur) {
               setIsValidating(prev => ({ ...prev, [name]: true }))

               try {
                    const result = await validateField(name, values[name])
                    setErrors(prev => ({
                         ...prev,
                         [name]: result.error || undefined
                    }))
                    setSuccesses(prev => ({
                         ...prev,
                         [name]: result.success || undefined
                    }))
               } catch (error) {
                    console.error('Validation error:', error)
               } finally {
                    setIsValidating(prev => ({ ...prev, [name]: false }))
               }
          }
     }, [validateOnBlur, validateField, values])

     // Handle form submission
     const handleSubmit = useCallback(async (onSubmit) => {
          setIsSubmitting(true)
          setSubmitCount(prev => prev + 1)

          // Mark all fields as touched
          const allTouched = Object.keys(values).reduce((acc, key) => {
               acc[key] = true
               return acc
          }, {})
          setTouched(allTouched)

          try {
               const isValid = await validateForm()

               if (isValid && onSubmit) {
                    await onSubmit(values)
               }

               return isValid
          } catch (error) {
               console.error('Form submission error:', error)
               throw error
          } finally {
               setIsSubmitting(false)
          }
     }, [values, validateForm])

     // Reset form
     const reset = useCallback((newValues = initialValues) => {
          setValues(newValues)
          setErrors({})
          setSuccesses({})
          setTouched({})
          setIsSubmitting(false)
          setSubmitCount(0)
          setIsValidating({})

          // Clear all timers
          Object.values(debounceTimers.current).forEach(clearTimeout)
          debounceTimers.current = {}

          // Cancel all async validations
          Object.values(asyncValidationControllers.current).forEach(controller => {
               controller.abort()
          })
          asyncValidationControllers.current = {}
     }, [initialValues])

     // Set field error manually
     const setFieldError = useCallback((name, error) => {
          setErrors(prev => ({
               ...prev,
               [name]: error
          }))
          setSuccesses(prev => ({
               ...prev,
               [name]: undefined
          }))
     }, [])

     // Set multiple errors
     const setFormErrors = useCallback((newErrors) => {
          setErrors(prev => ({
               ...prev,
               ...newErrors
          }))
          // Clear successes for fields with errors
          setSuccesses(prev => {
               const newSuccesses = { ...prev }
               Object.keys(newErrors).forEach(name => {
                    delete newSuccesses[name]
               })
               return newSuccesses
          })
     }, [])

     // Get field props for easy integration
     const getFieldProps = useCallback((name) => ({
          name,
          value: values[name] || '',
          onChange: (e) => {
               const value = e.target ? e.target.value : e
               handleChange(name, value)
          },
          onBlur: () => handleBlur(name),
          error: errors[name],
          success: successes[name],
          'aria-invalid': !!errors[name],
          'data-validating': isValidating[name]
     }), [values, errors, successes, isValidating, handleChange, handleBlur])

     // Cleanup on unmount
     useEffect(() => {
          return () => {
               Object.values(debounceTimers.current).forEach(clearTimeout)
               Object.values(asyncValidationControllers.current).forEach(controller => {
                    controller.abort()
               })
          }
     }, [])

     // Computed properties
     const isValid = Object.keys(errors).length === 0
     const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues)
     const hasErrors = Object.keys(errors).length > 0
     const isValidatingAny = Object.values(isValidating).some(Boolean)

     // Initial validation effect
     useEffect(() => {
          // Only validate if we have values and haven't validated yet
          const hasValues = Object.values(values).some(value => value && value.toString().trim() !== '')
          const hasBeenValidated = Object.keys(errors).length > 0 || Object.keys(touched).length > 0

          if (hasValues && !hasBeenValidated && !isValidatingAny) {
               validateForm()
          }
     }, [values, errors, touched, isValidatingAny, validateForm])

     return {
          values,
          errors,
          successes,
          touched,
          isSubmitting,
          isValid,
          isDirty,
          hasErrors,
          isValidatingAny,
          isValidating,
          submitCount,
          handleChange,
          handleBlur,
          handleSubmit,
          validateForm,
          validateField,
          reset,
          setFieldError,
          setFormErrors,
          getFieldProps,
          setValues
     }
}

export default useFormValidation