import { useEffect, useRef } from 'react'
import { AlertTriangle, X, Shield, Eye } from 'lucide-react'

const ViolationWarning = ({ 
  isVisible, 
  onClose, 
  violationCount, 
  message, 
  autoHideDelay = 8000 
}) => {
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (isVisible && autoHideDelay > 0) {
      timeoutRef.current = setTimeout(() => {
        onClose?.()
      }, autoHideDelay)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isVisible, autoHideDelay, onClose])

  const getWarningLevel = () => {
    if (violationCount >= 3) return 'critical'
    if (violationCount >= 2) return 'severe'
    if (violationCount >= 1) return 'warning'
    return 'info'
  }

  const getWarningStyles = () => {
    const level = getWarningLevel()
    switch (level) {
      case 'critical':
        return {
          bg: 'bg-red-100 border-red-500',
          text: 'text-red-900',
          icon: 'text-red-700',
          button: 'bg-red-700 hover:bg-red-800',
          accent: 'border-l-red-600'
        }
      case 'severe':
        return {
          bg: 'bg-orange-100 border-orange-500',
          text: 'text-orange-900',
          icon: 'text-orange-700',
          button: 'bg-orange-700 hover:bg-orange-800',
          accent: 'border-l-orange-600'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-100 border-yellow-500',
          text: 'text-yellow-900',
          icon: 'text-yellow-700',
          button: 'bg-yellow-700 hover:bg-yellow-800',
          accent: 'border-l-yellow-600'
        }
      default:
        return {
          bg: 'bg-blue-100 border-blue-500',
          text: 'text-blue-900',
          icon: 'text-blue-700',
          button: 'bg-blue-700 hover:bg-blue-800',
          accent: 'border-l-blue-600'
        }
    }
  }

  const getTitle = () => {
    const level = getWarningLevel()
    switch (level) {
      case 'critical':
        return '🚨 CRITICAL - Violation Limit Reached'
      case 'severe':
        return '⚠️ FINAL WARNING - Violation Detected'
      case 'warning':
        return '⚠️ WARNING - Security Violation Detected'
      default:
        return 'ℹ️ Notice - Security Event'
    }
  }

  const getProgressBarColor = () => {
    if (violationCount >= 3) return 'bg-red-600'
    if (violationCount >= 2) return 'bg-orange-500'
    if (violationCount >= 1) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getRemainingWarnings = () => {
    return Math.max(0, 3 - violationCount)
  }

  if (!isVisible) return null

  const styles = getWarningStyles()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg border-2 p-6 max-w-lg mx-auto shadow-2xl ${styles.bg} ${styles.accent} border-l-4`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-full bg-white bg-opacity-50 mr-3`}>
              <AlertTriangle className={`h-6 w-6 ${styles.icon}`} />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${styles.text}`}>
                {getTitle()}
              </h3>
              <p className={`text-sm ${styles.text} opacity-80`}>
                Anti-cheating system alert
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-full hover:bg-white hover:bg-opacity-20 ${styles.text} transition-colors`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className={`mb-6 ${styles.text}`}>
          <div className="bg-white bg-opacity-70 rounded-lg p-4 mb-4">
            <p className="font-medium mb-2">{message}</p>
          </div>
          
          <div className="bg-white bg-opacity-50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Violation Count:</span>
              <span className="font-bold text-lg">{violationCount} / 3</span>
            </div>
            
            <div className="w-full bg-gray-300 rounded-full h-3 mb-2">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                style={{ width: `${Math.min((violationCount / 3) * 100, 100)}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span>Warnings Remaining:</span>
              <span className="font-bold">{getRemainingWarnings()}</span>
            </div>
          </div>
          
          {violationCount >= 2 && (
            <div className="mt-4 p-4 bg-red-200 bg-opacity-80 border border-red-400 rounded-lg">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-red-700 mr-2" />
                <p className="text-red-900 text-sm font-bold">
                  CRITICAL WARNING
                </p>
              </div>
              <p className="text-red-800 text-sm">
                One more violation will automatically submit your exam and end the session immediately.
              </p>
            </div>
          )}

          {violationCount === 1 && (
            <div className="mt-4 p-3 bg-yellow-200 bg-opacity-80 border border-yellow-400 rounded-lg">
              <div className="flex items-center mb-1">
                <Eye className="h-4 w-4 text-yellow-700 mr-2" />
                <p className="text-yellow-900 text-sm font-medium">
                  Monitoring Active
                </p>
              </div>
              <p className="text-yellow-800 text-xs">
                Your exam session is being monitored for security violations. Please avoid switching tabs, copying content, or using keyboard shortcuts.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className={`px-6 py-3 text-white rounded-lg transition-colors font-medium shadow-lg ${styles.button}`}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}

export default ViolationWarning