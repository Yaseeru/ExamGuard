import React from 'react'
import { AlertCircle, X, RefreshCw, CheckCircle, Info } from 'lucide-react'

const ErrorMessage = ({
  title = 'Error',
  message,
  onRetry,
  onDismiss,
  variant = 'error',
  className = '',
  showIcon = true,
  autoHide = false,
  autoHideDelay = 5000,
  onAutoHide
}) => {
  const variantClasses = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  }

  const iconClasses = {
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
    success: 'text-green-500'
  }

  const icons = {
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
    success: CheckCircle
  }

  const Icon = icons[variant]

  // Auto-hide functionality
  React.useEffect(() => {
    if (autoHide && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        if (onAutoHide) {
          onAutoHide()
        } else if (onDismiss) {
          onDismiss()
        }
      }, autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDelay, onAutoHide, onDismiss])

  return (
    <div 
      className={`border rounded-lg p-4 ${variantClasses[variant]} ${className}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start">
        {showIcon && Icon && (
          <Icon className={`h-5 w-5 mt-0.5 mr-3 flex-shrink-0 ${iconClasses[variant]}`} aria-hidden="true" />
        )}
        
        <div className="flex-1">
          <h3 className="font-medium" id="error-title">{title}</h3>
          {message && (
            <p className="mt-1 text-sm opacity-90" id="error-message">{message}</p>
          )}
          
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex items-center gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
                  aria-describedby="error-title error-message"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Try Again
                </button>
              )}
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
                  aria-label="Dismiss error message"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`ml-2 flex-shrink-0 ${iconClasses[variant]} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded`}
            aria-label="Close error message"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

export default ErrorMessage