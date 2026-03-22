import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

const Toast = ({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  position = 'top-right',
  showCloseButton = true,
  persistent = false
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!persistent && duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, persistent])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose?.(id)
    }, 300) // Match animation duration
  }

  const variants = {
    success: {
      icon: CheckCircle,
      classes: 'bg-green-50 border-green-200 text-green-800',
      iconClasses: 'text-green-500'
    },
    error: {
      icon: AlertCircle,
      classes: 'bg-red-50 border-red-200 text-red-800',
      iconClasses: 'text-red-500'
    },
    warning: {
      icon: AlertTriangle,
      classes: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      iconClasses: 'text-yellow-500'
    },
    info: {
      icon: Info,
      classes: 'bg-blue-50 border-blue-200 text-blue-800',
      iconClasses: 'text-blue-500'
    }
  }

  const variant = variants[type]
  const Icon = variant.icon

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  }

  return (
    <div
      className={`
        fixed z-50 max-w-sm w-full transition-all duration-300 ease-in-out
        ${positionClasses[position]}
        ${isVisible && !isLeaving ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        ${isLeaving ? 'opacity-0 translate-y-2' : ''}
      `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={`border rounded-lg shadow-lg p-4 ${variant.classes}`}>
        <div className="flex items-start">
          <Icon className={`h-5 w-5 mt-0.5 mr-3 flex-shrink-0 ${variant.iconClasses}`} aria-hidden="true" />
          
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="font-medium text-sm">{title}</h4>
            )}
            {message && (
              <p className={`text-sm ${title ? 'mt-1' : ''} opacity-90`}>
                {message}
              </p>
            )}
          </div>
          
          {showCloseButton && (
            <button
              onClick={handleClose}
              className={`ml-2 flex-shrink-0 ${variant.iconClasses} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded`}
              aria-label="Close notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        
        {/* Progress bar for timed toasts */}
        {!persistent && duration > 0 && (
          <div className="mt-2 w-full bg-black bg-opacity-10 rounded-full h-1">
            <div 
              className="bg-current h-1 rounded-full transition-all ease-linear"
              style={{
                width: '100%',
                animation: `toast-progress ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Toast Container Component
export const ToastContainer = ({ toasts = [], onRemove }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onRemove}
        />
      ))}
    </div>
  )
}

export default Toast