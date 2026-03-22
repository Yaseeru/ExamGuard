import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const AccessibilityContext = createContext()

export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider')
  }
  return context
}

const AccessibilityProvider = ({ children }) => {
  const [announcements, setAnnouncements] = useState([])
  const [isKeyboardUser, setIsKeyboardUser] = useState(false)
  const announcementTimeoutRef = useRef(null)

  // Detect keyboard usage
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true)
        document.body.classList.add('keyboard-user')
      }
    }

    const handleMouseDown = () => {
      setIsKeyboardUser(false)
      document.body.classList.remove('keyboard-user')
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Announce to screen readers
  const announce = useCallback((message, priority = 'polite') => {
    if (!message) return

    const announcement = {
      id: Date.now(),
      message,
      priority,
      timestamp: new Date()
    }

    setAnnouncements(prev => [...prev, announcement])

    // Clear announcement after a delay
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current)
    }

    announcementTimeoutRef.current = setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id))
    }, 5000)
  }, [])

  // Skip to main content
  const skipToContent = useCallback((targetId = 'main-content') => {
    const target = document.getElementById(targetId)
    if (target) {
      target.focus()
      target.scrollIntoView({ behavior: 'smooth' })
      announce('Skipped to main content')
    }
  }, [announce])

  // Generate unique IDs
  const generateId = useCallback((prefix = 'a11y') => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const value = {
    announcements,
    isKeyboardUser,
    announce,
    skipToContent,
    generateId
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {/* Skip Links */}
      <div className="sr-only focus-within:not-sr-only">
        <button
          onClick={() => skipToContent('main-content')}
          className="skip-link"
        >
          Skip to main content
        </button>
      </div>

      {/* Screen Reader Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcements
          .filter(a => a.priority === 'polite')
          .map(announcement => (
            <div key={announcement.id}>
              {announcement.message}
            </div>
          ))}
      </div>

      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcements
          .filter(a => a.priority === 'assertive')
          .map(announcement => (
            <div key={announcement.id}>
              {announcement.message}
            </div>
          ))}
      </div>

      {children}
    </AccessibilityContext.Provider>
  )
}

export default AccessibilityProvider