import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle, Info } from 'lucide-react'

const FormField = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  success,
  required = false,
  disabled = false,
  className = '',
  icon: Icon,
  showPasswordToggle = false,
  helpText,
  autoComplete,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const inputType = type === 'password' && showPassword ? 'text' : type
  const hasError = !!error
  const hasSuccess = !!success && !hasError
  const fieldId = props.id || name

  // Generate aria-describedby IDs
  const errorId = `${fieldId}-error`
  const helpId = `${fieldId}-help`
  const successId = `${fieldId}-success`
  
  let describedBy = ariaDescribedBy || ''
  if (hasError) describedBy += ` ${errorId}`
  if (helpText && !hasError && !hasSuccess) describedBy += ` ${helpId}`
  if (hasSuccess) describedBy += ` ${successId}`
  describedBy = describedBy.trim()

  const inputClasses = `
    w-full px-3 py-2 border rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${Icon ? 'pl-10' : ''}
    ${(showPasswordToggle && type === 'password') ? 'pr-10' : ''}
    ${hasError 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : hasSuccess 
        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
        : isFocused
          ? 'border-blue-500 focus:border-blue-500 focus:ring-blue-500'
          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }
  `.trim()

  return (
    <div className={className}>
      {label && (
        <label 
          htmlFor={fieldId} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon 
              className={`h-5 w-5 ${hasError ? 'text-red-400' : hasSuccess ? 'text-green-400' : 'text-gray-400'}`} 
              aria-hidden="true"
            />
          </div>
        )}
        
        <input
          id={fieldId}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={(e) => {
            setIsFocused(false)
            onBlur?.(e)
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={describedBy || undefined}
          aria-required={required}
          autoComplete={autoComplete}
          {...props}
        />
        
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 rounded-r-lg"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" aria-hidden="true" />
            )}
          </button>
        )}
        
        {/* Status icons */}
        {(hasError || hasSuccess) && !Icon && !(showPasswordToggle && type === 'password') && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {hasError && <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />}
            {hasSuccess && <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {hasError && (
        <div id={errorId} className="mt-1 text-sm text-red-600 flex items-center" role="alert">
          <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
      
      {/* Success message */}
      {hasSuccess && (
        <div id={successId} className="mt-1 text-sm text-green-600 flex items-center" role="status">
          <CheckCircle className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
          {success}
        </div>
      )}
      
      {/* Help text */}
      {helpText && !hasError && !hasSuccess && (
        <div id={helpId} className="mt-1 text-sm text-gray-500 flex items-start">
          <Info className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" aria-hidden="true" />
          {helpText}
        </div>
      )}
    </div>
  )
}

export default FormField