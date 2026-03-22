import { useState, useEffect, useRef } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'

const ExamTimer = ({ 
  initialTime, 
  onTimeUpdate, 
  onTimeExpired, 
  onWarning,
  warningThresholds = { warning: 300, critical: 60 }, // 5 minutes and 1 minute
  syncInterval = 30000 // 30 seconds
}) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime)
  const [isWarning, setIsWarning] = useState(false)
  const [isCritical, setIsCritical] = useState(false)
  const [hasWarned, setHasWarned] = useState({ warning: false, critical: false })
  
  const timerRef = useRef(null)
  const lastWarningRef = useRef({ warning: false, critical: false })

  useEffect(() => {
    setTimeRemaining(initialTime)
    setHasWarned({ warning: false, critical: false })
    lastWarningRef.current = { warning: false, critical: false }
  }, [initialTime])

  useEffect(() => {
    if (timeRemaining > 0) {
      // Start the main timer
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1)
          
          // Check warning states
          const nowWarning = newTime <= warningThresholds.warning && newTime > warningThresholds.critical
          const nowCritical = newTime <= warningThresholds.critical && newTime > 0
          
          setIsWarning(nowWarning || nowCritical)
          setIsCritical(nowCritical)
          
          // Trigger warning callbacks only once per threshold
          if (nowCritical && !lastWarningRef.current.critical) {
            onWarning?.(newTime, 'critical')
            lastWarningRef.current.critical = true
            setHasWarned(prev => ({ ...prev, critical: true }))
          } else if (nowWarning && !nowCritical && !lastWarningRef.current.warning) {
            onWarning?.(newTime, 'warning')
            lastWarningRef.current.warning = true
            setHasWarned(prev => ({ ...prev, warning: true }))
          }
          
          // Call update callback
          onTimeUpdate?.(newTime)
          
          // Auto-submit when time expires
          if (newTime === 0) {
            onTimeExpired?.()
          }
          
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [timeRemaining, warningThresholds, onTimeUpdate, onTimeExpired, onWarning])

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerColor = () => {
    if (isCritical) return 'text-red-600'
    if (isWarning) return 'text-orange-600'
    return 'text-green-600'
  }

  const getBackgroundColor = () => {
    if (isCritical) return 'bg-red-50 border-red-200'
    if (isWarning) return 'bg-orange-50 border-orange-200'
    return 'bg-green-50 border-green-200'
  }

  const getStatusText = () => {
    if (isCritical) return 'CRITICAL'
    if (isWarning) return 'LOW TIME'
    return null
  }

  return (
    <div className={`flex items-center px-4 py-2 rounded-lg border transition-all duration-300 ${getBackgroundColor()}`}>
      {(isWarning || isCritical) && (
        <AlertTriangle className={`h-5 w-5 mr-2 ${isCritical ? 'text-red-600 animate-pulse' : 'text-orange-600'}`} />
      )}
      <Clock className={`h-5 w-5 mr-2 ${getTimerColor()}`} />
      <div className="flex flex-col">
        <span className={`text-lg font-mono font-bold ${getTimerColor()}`}>
          {formatTime(timeRemaining)}
        </span>
        {getStatusText() && (
          <span className={`text-xs font-medium ${getTimerColor()} ${isCritical ? 'animate-pulse' : ''}`}>
            {getStatusText()}
          </span>
        )}
      </div>
    </div>
  )
}

export default ExamTimer