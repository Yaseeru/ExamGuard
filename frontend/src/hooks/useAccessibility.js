import { useState, useEffect, useCallback, useRef } from 'react'

const useAccessibility = (options = {}) => {
     const {
          enableKeyboardNavigation = true,
          enableFocusManagement = true,
          enableScreenReaderSupport = true,
          trapFocus = false,
          restoreFocus = true,
          announceChanges = true
     } = options

     const [isKeyboardUser, setIsKeyboardUser] = useState(false)
     const [focusedElement, setFocusedElement] = useState(null)
     const [announcements, setAnnouncements] = useState([])

     const previousFocusRef = useRef(null)
     const focusTrapRef = useRef(null)
     const announcementTimeoutRef = useRef(null)

     // Detect keyboard usage
     useEffect(() => {
          if (!enableKeyboardNavigation) return

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
     }, [enableKeyboardNavigation])

     // Focus management
     useEffect(() => {
          if (!enableFocusManagement) return

          const handleFocusChange = (e) => {
               setFocusedElement(e.target)
          }

          document.addEventListener('focusin', handleFocusChange)
          return () => document.removeEventListener('focusin', handleFocusChange)
     }, [enableFocusManagement])

     // Store previous focus for restoration
     const storePreviousFocus = useCallback(() => {
          if (restoreFocus) {
               previousFocusRef.current = document.activeElement
          }
     }, [restoreFocus])

     // Restore previous focus
     const restorePreviousFocus = useCallback(() => {
          if (restoreFocus && previousFocusRef.current) {
               previousFocusRef.current.focus()
               previousFocusRef.current = null
          }
     }, [restoreFocus])

     // Focus trap implementation
     const setupFocusTrap = useCallback((containerRef) => {
          if (!trapFocus || !containerRef.current) return

          focusTrapRef.current = containerRef.current

          const focusableElements = containerRef.current.querySelectorAll(
               'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )

          const firstElement = focusableElements[0]
          const lastElement = focusableElements[focusableElements.length - 1]

          const handleKeyDown = (e) => {
               if (e.key === 'Tab') {
                    if (e.shiftKey) {
                         if (document.activeElement === firstElement) {
                              e.preventDefault()
                              lastElement.focus()
                         }
                    } else {
                         if (document.activeElement === lastElement) {
                              e.preventDefault()
                              firstElement.focus()
                         }
                    }
               }

               if (e.key === 'Escape') {
                    restorePreviousFocus()
               }
          }

          containerRef.current.addEventListener('keydown', handleKeyDown)

          // Focus first element
          if (firstElement) {
               firstElement.focus()
          }

          return () => {
               if (containerRef.current) {
                    containerRef.current.removeEventListener('keydown', handleKeyDown)
               }
          }
     }, [trapFocus, restorePreviousFocus])

     // Remove focus trap
     const removeFocusTrap = useCallback(() => {
          focusTrapRef.current = null
     }, [])

     // Announce to screen readers
     const announce = useCallback((message, priority = 'polite') => {
          if (!announceChanges || !enableScreenReaderSupport) return

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
     }, [announceChanges, enableScreenReaderSupport])

     // Skip to content functionality
     const skipToContent = useCallback((targetId = 'main-content') => {
          const target = document.getElementById(targetId)
          if (target) {
               target.focus()
               target.scrollIntoView({ behavior: 'smooth' })
          }
     }, [])

     // Keyboard navigation helpers
     const handleArrowNavigation = useCallback((e, items, currentIndex, onNavigate) => {
          if (!enableKeyboardNavigation) return

          let newIndex = currentIndex

          switch (e.key) {
               case 'ArrowDown':
               case 'ArrowRight':
                    e.preventDefault()
                    newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
                    break
               case 'ArrowUp':
               case 'ArrowLeft':
                    e.preventDefault()
                    newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
                    break
               case 'Home':
                    e.preventDefault()
                    newIndex = 0
                    break
               case 'End':
                    e.preventDefault()
                    newIndex = items.length - 1
                    break
               default:
                    return
          }

          onNavigate(newIndex)
     }, [enableKeyboardNavigation])

     // Generate unique IDs for accessibility
     const generateId = useCallback((prefix = 'a11y') => {
          return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
     }, [])

     // Check if element is visible to screen readers
     const isElementVisible = useCallback((element) => {
          if (!element) return false

          const style = window.getComputedStyle(element)
          return (
               style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0' &&
               element.getAttribute('aria-hidden') !== 'true'
          )
     }, [])

     // Get accessible name for element
     const getAccessibleName = useCallback((element) => {
          if (!element) return ''

          // Check aria-label
          const ariaLabel = element.getAttribute('aria-label')
          if (ariaLabel) return ariaLabel

          // Check aria-labelledby
          const labelledBy = element.getAttribute('aria-labelledby')
          if (labelledBy) {
               const labelElement = document.getElementById(labelledBy)
               if (labelElement) return labelElement.textContent || ''
          }

          // Check associated label
          if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
               const label = document.querySelector(`label[for="${element.id}"]`)
               if (label) return label.textContent || ''
          }

          // Fallback to text content
          return element.textContent || element.value || ''
     }, [])

     // Cleanup
     useEffect(() => {
          return () => {
               if (announcementTimeoutRef.current) {
                    clearTimeout(announcementTimeoutRef.current)
               }
          }
     }, [])

     return {
          // State
          isKeyboardUser,
          focusedElement,
          announcements,

          // Focus management
          storePreviousFocus,
          restorePreviousFocus,
          setupFocusTrap,
          removeFocusTrap,

          // Screen reader support
          announce,

          // Navigation
          skipToContent,
          handleArrowNavigation,

          // Utilities
          generateId,
          isElementVisible,
          getAccessibleName
     }
}

export default useAccessibility