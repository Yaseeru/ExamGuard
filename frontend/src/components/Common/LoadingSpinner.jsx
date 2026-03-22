import { Loader2 } from 'lucide-react'

const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...', 
  fullScreen = false,
  className = '',
  showText = true,
  overlay = false,
  'aria-label': ariaLabel
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  const spinner = (
    <div 
      className={`flex flex-col items-center justify-center ${className}`}
      role="status"
      aria-label={ariaLabel || text}
    >
      <Loader2 
        className={`animate-spin text-blue-600 ${sizeClasses[size]}`} 
        aria-hidden="true"
      />
      {showText && (
        <p className={`mt-2 text-gray-600 ${textSizeClasses[size]}`}>
          {text}
        </p>
      )}
      <span className="sr-only">{text}</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50"
        aria-modal="true"
        role="dialog"
        aria-label="Loading"
      >
        {spinner}
      </div>
    )
  }

  if (overlay) {
    return (
      <div 
        className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10"
        aria-label="Loading overlay"
      >
        {spinner}
      </div>
    )
  }

  return spinner
}

export default LoadingSpinner