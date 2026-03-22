import { Loader2 } from 'lucide-react'

const LoadingButton = ({
  loading = false,
  disabled = false,
  children,
  loadingText = 'Loading...',
  className = '',
  variant = 'primary',
  type = 'button',
  size = 'md',
  fullWidth = false,
  'aria-label': ariaLabel,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg'
  }
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 disabled:hover:bg-blue-600',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500 disabled:hover:bg-gray-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 disabled:hover:bg-red-600',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 disabled:hover:bg-green-600',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-blue-500 disabled:hover:bg-white'
  }

  const isDisabled = loading || disabled
  const buttonText = loading ? loadingText : children

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      aria-label={ariaLabel || (loading ? loadingText : undefined)}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading && (
        <Loader2 
          className={`animate-spin mr-2 ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} 
          aria-hidden="true"
        />
      )}
      <span>{buttonText}</span>
      {loading && <span className="sr-only">Loading, please wait</span>}
    </button>
  )
}

export default LoadingButton