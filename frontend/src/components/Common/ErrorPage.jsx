import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Home, ArrowLeft, Wifi, WifiOff } from 'lucide-react'
import { LoadingButton } from './index'
import useResponsive from '../../hooks/useResponsive'

const ErrorPage = ({
  error,
  title,
  message,
  showRetry = true,
  showGoHome = true,
  showGoBack = true,
  onRetry,
  customActions,
  className = ''
}) => {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()

  // Determine error type and appropriate messaging
  const getErrorInfo = () => {
    if (error?.code === 'NETWORK_ERROR' || error?.message === 'Network Error') {
      return {
        icon: WifiOff,
        title: title || 'Connection Problem',
        message: message || 'Unable to connect to the server. Please check your internet connection and try again.',
        color: 'text-orange-500'
      }
    }

    if (error?.response?.status === 404) {
      return {
        icon: AlertTriangle,
        title: title || 'Page Not Found',
        message: message || 'The page you\'re looking for doesn\'t exist or has been moved.',
        color: 'text-yellow-500'
      }
    }

    if (error?.response?.status === 403) {
      return {
        icon: AlertTriangle,
        title: title || 'Access Denied',
        message: message || 'You don\'t have permission to access this resource.',
        color: 'text-red-500'
      }
    }

    if (error?.response?.status === 500) {
      return {
        icon: AlertTriangle,
        title: title || 'Server Error',
        message: message || 'Something went wrong on our end. Please try again later.',
        color: 'text-red-500'
      }
    }

    // Default error
    return {
      icon: AlertTriangle,
      title: title || 'Something Went Wrong',
      message: message || 'An unexpected error occurred. Please try again.',
      color: 'text-red-500'
    }
  }

  const errorInfo = getErrorInfo()
  const Icon = errorInfo.icon

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  const handleGoHome = () => {
    navigate('/')
  }

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 px-4 ${className}`}>
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <Icon className={`h-16 w-16 ${errorInfo.color}`} aria-hidden="true" />
          </div>
          
          {/* Error Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {errorInfo.title}
          </h1>
          
          {/* Error Message */}
          <p className="text-gray-600 mb-8 leading-relaxed">
            {errorInfo.message}
          </p>

          {/* Error Details (Development) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-40">
                <div className="mb-2">
                  <strong>Status:</strong> {error?.response?.status || 'Unknown'}
                </div>
                <div className="mb-2">
                  <strong>Message:</strong> {error?.message || 'No message'}
                </div>
                {error?.response?.data && (
                  <div className="mb-2">
                    <strong>Response:</strong>
                    <pre className="whitespace-pre-wrap mt-1">
                      {JSON.stringify(error.response.data, null, 2)}
                    </pre>
                  </div>
                )}
                {error?.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1 text-xs">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className={`space-y-3 ${isMobile ? '' : 'flex flex-col sm:flex-row sm:space-y-0 sm:space-x-3'}`}>
            {showRetry && (
              <LoadingButton
                onClick={handleRetry}
                variant="primary"
                className={isMobile ? 'w-full' : 'flex-1'}
                aria-label="Retry the failed operation"
              >
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Try Again
              </LoadingButton>
            )}
            
            {showGoBack && (
              <button
                onClick={handleGoBack}
                className={`btn-secondary ${isMobile ? 'w-full' : 'flex-1'}`}
                aria-label="Go back to previous page"
              >
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                Go Back
              </button>
            )}
            
            {showGoHome && (
              <button
                onClick={handleGoHome}
                className={`btn-outline ${isMobile ? 'w-full' : 'flex-1'}`}
                aria-label="Go to homepage"
              >
                <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                Home
              </button>
            )}
          </div>

          {/* Custom Actions */}
          {customActions && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {customActions}
            </div>
          )}

          {/* Network Status Indicator */}
          {(error?.code === 'NETWORK_ERROR' || error?.message === 'Network Error') && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center text-sm text-gray-500">
                <Wifi className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Check your internet connection</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorPage