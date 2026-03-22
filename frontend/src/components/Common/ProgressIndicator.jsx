const ProgressIndicator = ({
  steps,
  currentStep,
  className = '',
  variant = 'default'
}) => {
  const variants = {
    default: {
      container: 'bg-gray-200',
      completed: 'bg-blue-600',
      current: 'bg-blue-400',
      pending: 'bg-gray-300'
    },
    success: {
      container: 'bg-gray-200',
      completed: 'bg-green-600',
      current: 'bg-green-400',
      pending: 'bg-gray-300'
    },
    warning: {
      container: 'bg-gray-200',
      completed: 'bg-yellow-600',
      current: 'bg-yellow-400',
      pending: 'bg-gray-300'
    }
  }

  const colors = variants[variant]

  if (typeof steps === 'number') {
    // Simple progress bar
    const percentage = Math.min(100, Math.max(0, (currentStep / steps) * 100))
    
    return (
      <div className={`w-full ${className}`}>
        <div className={`w-full h-2 rounded-full ${colors.container}`}>
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${colors.completed}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Step {currentStep}</span>
          <span>{steps} total</span>
        </div>
      </div>
    )
  }

  // Step-based progress indicator
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isPending = stepNumber > currentStep

          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${isCompleted ? `${colors.completed} text-white` : ''}
                    ${isCurrent ? `${colors.current} text-white` : ''}
                    ${isPending ? `${colors.pending} text-gray-600` : ''}
                  `}
                >
                  {stepNumber}
                </div>
                <span className="text-xs text-gray-600 mt-1 text-center max-w-20">
                  {step.title || step}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded ${colors.container}`}>
                  <div 
                    className={`h-1 rounded transition-all duration-300 ${
                      isCompleted ? colors.completed : colors.pending
                    }`}
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProgressIndicator