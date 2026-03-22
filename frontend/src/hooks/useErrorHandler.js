import { useState, useCallback, useRef } from 'react'
import { toast } from 'react-hot-toast'

const useErrorHandler = (options = {}) => {
     const {
          showToast = true,
          logErrors = true,
          retryAttempts = 3,
          retryDelay = 1000,
          onError,
          onRetry,
          onMaxRetriesReached
     } = options

     const [errors, setErrors] = useState({})
     const [isRetrying, setIsRetrying] = useState({})
     const [retryCount, setRetryCount] = useState({})

     const retryTimeouts = useRef({})

     // Clear error for a specific key
     const clearError = useCallback((key) => {
          setErrors(prev => {
               const newErrors = { ...prev }
               delete newErrors[key]
               return newErrors
          })
          setRetryCount(prev => {
               const newCount = { ...prev }
               delete newCount[key]
               return newCount
          })

          if (retryTimeouts.current[key]) {
               clearTimeout(retryTimeouts.current[key])
               delete retryTimeouts.current[key]
          }
     }, [])

     // Clear all errors
     const clearAllErrors = useCallback(() => {
          setErrors({})
          setRetryCount({})
          setIsRetrying({})

          Object.values(retryTimeouts.current).forEach(clearTimeout)
          retryTimeouts.current = {}
     }, [])

     // Handle error with automatic retry logic
     const handleError = useCallback(async (error, key = 'default', retryFn = null) => {
          const errorInfo = {
               message: error?.message || 'An unexpected error occurred',
               code: error?.code || error?.response?.status,
               details: error?.response?.data || error?.details,
               timestamp: new Date().toISOString(),
               key
          }

          // Log error if enabled
          if (logErrors) {
               console.error(`Error [${key}]:`, errorInfo)
          }

          // Call custom error handler
          if (onError) {
               onError(errorInfo)
          }

          // Store error
          setErrors(prev => ({
               ...prev,
               [key]: errorInfo
          }))

          // Show toast notification
          if (showToast) {
               const toastMessage = getErrorMessage(error)
               toast.error(toastMessage, {
                    id: `error-${key}`,
                    duration: 5000
               })
          }

          // Handle retry logic
          if (retryFn && retryAttempts > 0) {
               const currentRetryCount = retryCount[key] || 0

               if (currentRetryCount < retryAttempts) {
                    setRetryCount(prev => ({
                         ...prev,
                         [key]: currentRetryCount + 1
                    }))

                    // Call retry callback
                    if (onRetry) {
                         onRetry(errorInfo, currentRetryCount + 1)
                    }

                    // Schedule retry
                    const delay = retryDelay * Math.pow(2, currentRetryCount) // Exponential backoff
                    retryTimeouts.current[key] = setTimeout(async () => {
                         setIsRetrying(prev => ({ ...prev, [key]: true }))

                         try {
                              await retryFn()
                              clearError(key)

                              if (showToast) {
                                   toast.success('Operation completed successfully', {
                                        id: `success-${key}`
                                   })
                              }
                         } catch (retryError) {
                              await handleError(retryError, key, retryFn)
                         } finally {
                              setIsRetrying(prev => ({ ...prev, [key]: false }))
                         }
                    }, delay)
               } else {
                    // Max retries reached
                    if (onMaxRetriesReached) {
                         onMaxRetriesReached(errorInfo)
                    }

                    if (showToast) {
                         toast.error('Maximum retry attempts reached. Please try again later.', {
                              id: `max-retries-${key}`,
                              duration: 8000
                         })
                    }
               }
          }

          return errorInfo
     }, [
          logErrors,
          showToast,
          retryAttempts,
          retryDelay,
          onError,
          onRetry,
          onMaxRetriesReached,
          retryCount
     ])

     // Manual retry function
     const retry = useCallback(async (key, retryFn) => {
          if (!retryFn) return

          clearError(key)
          setIsRetrying(prev => ({ ...prev, [key]: true }))

          try {
               await retryFn()

               if (showToast) {
                    toast.success('Operation completed successfully', {
                         id: `retry-success-${key}`
                    })
               }
          } catch (error) {
               await handleError(error, key, retryFn)
          } finally {
               setIsRetrying(prev => ({ ...prev, [key]: false }))
          }
     }, [handleError, showToast, clearError])

     // Async operation wrapper with error handling
     const withErrorHandling = useCallback((asyncFn, key = 'default', options = {}) => {
          const { enableRetry = false, customRetryFn } = options

          return async (...args) => {
               try {
                    clearError(key)
                    return await asyncFn(...args)
               } catch (error) {
                    const retryFn = enableRetry ? (customRetryFn || (() => asyncFn(...args))) : null
                    await handleError(error, key, retryFn)
                    throw error
               }
          }
     }, [handleError, clearError])

     // Get user-friendly error message
     const getErrorMessage = useCallback((error) => {
          if (typeof error === 'string') return error

          // API error responses
          if (error?.response?.data?.message) {
               return error.response.data.message
          }

          if (error?.response?.data?.error?.message) {
               return error.response.data.error.message
          }

          // Network errors
          if (error?.code === 'NETWORK_ERROR' || error?.message === 'Network Error') {
               return 'Network connection failed. Please check your internet connection.'
          }

          // Timeout errors
          if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
               return 'Request timed out. Please try again.'
          }

          // HTTP status codes
          if (error?.response?.status) {
               const status = error.response.status
               switch (status) {
                    case 400:
                         return 'Invalid request. Please check your input.'
                    case 401:
                         return 'Authentication required. Please log in again.'
                    case 403:
                         return 'Access denied. You do not have permission to perform this action.'
                    case 404:
                         return 'The requested resource was not found.'
                    case 409:
                         return 'Conflict detected. The resource may have been modified.'
                    case 422:
                         return 'Validation failed. Please check your input.'
                    case 429:
                         return 'Too many requests. Please wait a moment and try again.'
                    case 500:
                         return 'Server error. Please try again later.'
                    case 502:
                    case 503:
                    case 504:
                         return 'Service temporarily unavailable. Please try again later.'
                    default:
                         return `Request failed with status ${status}`
               }
          }

          return error?.message || 'An unexpected error occurred'
     }, [])

     // Check if there are any errors
     const hasErrors = Object.keys(errors).length > 0
     const hasError = useCallback((key) => !!errors[key], [errors])
     const getError = useCallback((key) => errors[key], [errors])
     const isRetryingOperation = useCallback((key) => !!isRetrying[key], [isRetrying])

     return {
          errors,
          hasErrors,
          hasError,
          getError,
          isRetrying,
          isRetryingOperation,
          retryCount,
          handleError,
          clearError,
          clearAllErrors,
          retry,
          withErrorHandling,
          getErrorMessage
     }
}

export default useErrorHandler