import React from 'react'
import { LoadingSpinner } from './index'
import useResponsive from '../../hooks/useResponsive'

const LoadingState = ({
  type = 'page',
  title = 'Loading...',
  message,
  progress,
  steps,
  currentStep,
  showProgress = false,
  className = '',
  size = 'md'
}) => {
  const { isMobile } = useResponsive()

  // Skeleton loading for cards/lists
  const SkeletonCard = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="rounded-full bg-gray-200 h-12 w-12"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  )

  const SkeletonList = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
          <div className="rounded-full bg-gray-200 h-10 w-10"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
      ))}
    </div>
  )

  const SkeletonTable = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 animate-pulse">
        <div className="flex space-x-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
      {/* Rows */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-gray-200 animate-pulse">
          <div className="flex space-x-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  )

  const SkeletonForm = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/5"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
      <div className="flex space-x-3">
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  )

  // Progress indicator
  const ProgressIndicator = () => (
    <div className="w-full max-w-md mx-auto">
      {showProgress && typeof progress === 'number' && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {steps && currentStep && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {steps.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                    ${index + 1 < currentStep 
                      ? 'bg-green-500 text-white' 
                      : index + 1 === currentStep 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-1 mx-1 ${index + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-600 text-center">
            {steps[currentStep - 1]}
          </div>
        </div>
      )}
    </div>
  )

  // Render based on type
  switch (type) {
    case 'skeleton-cards':
      return (
        <div className={`space-y-6 ${className}`}>
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )

    case 'skeleton-list':
      return (
        <div className={className}>
          <SkeletonList />
        </div>
      )

    case 'skeleton-table':
      return (
        <div className={className}>
          <SkeletonTable />
        </div>
      )

    case 'skeleton-form':
      return (
        <div className={className}>
          <SkeletonForm />
        </div>
      )

    case 'inline':
      return (
        <div className={`flex items-center justify-center p-8 ${className}`}>
          <LoadingSpinner 
            size={size} 
            text={title} 
            showText={true}
            aria-label={title}
          />
        </div>
      )

    case 'overlay':
      return (
        <div className={`absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 ${className}`}>
          <div className="text-center">
            <LoadingSpinner 
              size={size} 
              text={title} 
              showText={true}
              aria-label={title}
            />
            {message && (
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            )}
            <ProgressIndicator />
          </div>
        </div>
      )

    case 'page':
    default:
      return (
        <div className={`min-h-screen flex items-center justify-center bg-gray-50 px-4 ${className}`}>
          <div className="text-center max-w-md w-full">
            <LoadingSpinner 
              size={size} 
              text={title} 
              showText={true}
              aria-label={title}
            />
            {message && (
              <p className="mt-4 text-gray-600 leading-relaxed">{message}</p>
            )}
            <ProgressIndicator />
          </div>
        </div>
      )
  }
}

export default LoadingState