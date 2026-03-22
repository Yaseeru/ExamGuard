import axios from 'axios'
import { toast } from 'react-hot-toast'

// Create axios instance with default config
const api = axios.create({
     baseURL: '/api',
     timeout: 10000,
     headers: {
          'Content-Type': 'application/json',
     },
})

// Global loading state management
let activeRequests = 0
const loadingCallbacks = new Set()

const updateLoadingState = (isLoading) => {
     loadingCallbacks.forEach(callback => callback(isLoading))
}

// Subscribe to loading state changes
export const subscribeToLoadingState = (callback) => {
     loadingCallbacks.add(callback)
     return () => loadingCallbacks.delete(callback)
}

// Request interceptor to add auth token and manage loading
api.interceptors.request.use(
     (config) => {
          const token = localStorage.getItem('token')
          if (token) {
               config.headers.Authorization = `Bearer ${token}`
          }

          // Track loading state
          activeRequests++
          if (activeRequests === 1) {
               updateLoadingState(true)
          }

          return config
     },
     (error) => {
          activeRequests = Math.max(0, activeRequests - 1)
          if (activeRequests === 0) {
               updateLoadingState(false)
          }
          return Promise.reject(error)
     }
)

// Response interceptor for error handling and loading management
api.interceptors.response.use(
     (response) => {
          activeRequests = Math.max(0, activeRequests - 1)
          if (activeRequests === 0) {
               updateLoadingState(false)
          }
          return response
     },
     (error) => {
          activeRequests = Math.max(0, activeRequests - 1)
          if (activeRequests === 0) {
               updateLoadingState(false)
          }

          const { response, code, message } = error

          // Handle different error scenarios
          if (response?.status === 401) {
               // Unauthorized - clear token and redirect to login
               localStorage.removeItem('token')
               delete axios.defaults.headers.common['Authorization']

               // Only redirect if not already on login page
               if (window.location.pathname !== '/login') {
                    window.location.href = '/login'
                    toast.error('Session expired. Please login again.')
               }
          } else if (response?.status === 403) {
               toast.error('Access denied. You don\'t have permission for this action.')
          } else if (response?.status === 404) {
               toast.error('Resource not found.')
          } else if (response?.status === 409) {
               // Conflict errors (e.g., duplicate data, capacity exceeded)
               const errorMessage = response?.data?.error?.message ||
                    response?.data?.message ||
                    'A conflict occurred. Please check your data and try again.'
               toast.error(errorMessage)
          } else if (response?.status === 422) {
               // Validation errors
               const errorMessage = response?.data?.error?.message ||
                    response?.data?.message ||
                    'Validation failed. Please check your input.'
               toast.error(errorMessage)
          } else if (response?.status === 429) {
               // Rate limit exceeded
               toast.error('Too many requests. Please wait a moment and try again.')
          } else if (response?.status >= 500) {
               toast.error('Server error. Please try again later.')
          } else if (code === 'ECONNABORTED') {
               toast.error('Request timeout. Please check your connection.')
          } else if (code === 'ERR_NETWORK') {
               toast.error('Network error. Please check your internet connection.')
          } else {
               // Generic error handling
               const errorMessage = response?.data?.error?.message ||
                    response?.data?.message ||
                    message ||
                    'An unexpected error occurred'
               toast.error(errorMessage)
          }

          return Promise.reject(error)
     }
)

// Enhanced API methods with better error handling
export const apiMethods = {
     // GET request with error handling
     get: async (url, config = {}) => {
          try {
               const response = await api.get(url, config)
               return response.data
          } catch (error) {
               throw new Error(error.response?.data?.error?.message || error.message)
          }
     },

     // POST request with error handling
     post: async (url, data = {}, config = {}) => {
          try {
               const response = await api.post(url, data, config)
               return response.data
          } catch (error) {
               throw new Error(error.response?.data?.error?.message || error.message)
          }
     },

     // PUT request with error handling
     put: async (url, data = {}, config = {}) => {
          try {
               const response = await api.put(url, data, config)
               return response.data
          } catch (error) {
               throw new Error(error.response?.data?.error?.message || error.message)
          }
     },

     // DELETE request with error handling
     delete: async (url, config = {}) => {
          try {
               const response = await api.delete(url, config)
               return response.data
          } catch (error) {
               throw new Error(error.response?.data?.error?.message || error.message)
          }
     },

     // PATCH request with error handling
     patch: async (url, data = {}, config = {}) => {
          try {
               const response = await api.patch(url, data, config)
               return response.data
          } catch (error) {
               throw new Error(error.response?.data?.error?.message || error.message)
          }
     }
}

export default api