import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'

/**
 * Custom hook for anti-cheating measures during exam sessions
 * Implements comprehensive monitoring and prevention of cheating attempts
 */
export const useAntiCheating = (isActive, onViolation) => {
     const cleanupFunctionsRef = useRef([])
     const securityStylesRef = useRef(null)
     const hasShownInitialMessageRef = useRef(false)
     const lastViolationRef = useRef({ type: null, timestamp: 0 })
     const violationDebounceMs = 1000 // Prevent duplicate violations within 1 second

     const recordViolation = useCallback((type, details) => {
          if (isActive && onViolation) {
               // Debounce mechanism to prevent duplicate violations
               const now = Date.now()
               const lastViolation = lastViolationRef.current

               // If same violation type within debounce period, skip it
               if (lastViolation.type === type && (now - lastViolation.timestamp) < violationDebounceMs) {
                    console.log(`Skipping duplicate ${type} violation (debounced)`)
                    return
               }

               // Record the violation
               lastViolationRef.current = { type, timestamp: now }
               onViolation(type, details)
          }
     }, [isActive, onViolation])

     const setupPageVisibilityMonitoring = useCallback(() => {
          // Enhanced Page Visibility API monitoring
          // Use only visibilitychange to avoid duplicate violations
          const handleVisibilityChange = () => {
               if (document.hidden && isActive) {
                    const timestamp = new Date().toISOString()
                    recordViolation('tab_switch', `Browser tab switched or window lost focus at ${timestamp}`)
               }
          }

          const handleWindowFocus = () => {
               if (isActive) {
                    // Log focus regain for monitoring (not a violation)
                    console.log('Window regained focus at', new Date().toISOString())
               }
          }

          document.addEventListener('visibilitychange', handleVisibilityChange, { capture: true })
          window.addEventListener('focus', handleWindowFocus, { capture: true })

          return () => {
               document.removeEventListener('visibilitychange', handleVisibilityChange, { capture: true })
               window.removeEventListener('focus', handleWindowFocus, { capture: true })
          }
     }, [isActive, recordViolation])

     const setupKeyboardPrevention = useCallback(() => {
          const handleKeyDown = (e) => {
               if (!isActive) return

               // Prevent copy operations (Ctrl+C)
               if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('copy_attempt', 'Copy operation attempted (Ctrl+C)')
                    return false
               }

               // Prevent paste operations (Ctrl+V)
               if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('paste_attempt', 'Paste operation attempted (Ctrl+V)')
                    return false
               }

               // Prevent cut operations (Ctrl+X)
               if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('cut_attempt', 'Cut operation attempted (Ctrl+X)')
                    return false
               }

               // Prevent select all (Ctrl+A)
               if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('select_all_attempt', 'Select all attempted (Ctrl+A)')
                    return false
               }

               // Prevent developer tools access
               if (e.key === 'F12' ||
                    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
                    (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
                    (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) ||
                    (e.ctrlKey && (e.key === 'U' || e.key === 'u'))) {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('dev_tools_attempt', 'Developer tools access attempted')
                    return false
               }

               // Prevent page refresh
               if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('refresh_attempt', 'Page refresh attempted')
                    return false
               }

               // Prevent print screen
               if (e.key === 'PrintScreen') {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('print_screen_attempt', 'Print screen attempted')
                    return false
               }

               // Prevent Alt+Tab (limited effectiveness but worth trying)
               if (e.altKey && e.key === 'Tab') {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('alt_tab_attempt', 'Alt+Tab window switching attempted')
                    return false
               }

               // Prevent Ctrl+Shift+T (reopen closed tab)
               if (e.ctrlKey && e.shiftKey && (e.key === 't' || e.key === 'T')) {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('reopen_tab_attempt', 'Attempt to reopen closed tab')
                    return false
               }

               // Prevent Ctrl+T (new tab)
               if (e.ctrlKey && (e.key === 't' || e.key === 'T') && !e.shiftKey) {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('new_tab_attempt', 'Attempt to open new tab')
                    return false
               }

               // Prevent Ctrl+N (new window)
               if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('new_window_attempt', 'Attempt to open new window')
                    return false
               }
          }

          document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false })

          return () => {
               document.removeEventListener('keydown', handleKeyDown, { capture: true })
          }
     }, [isActive, recordViolation])

     const setupMousePrevention = useCallback(() => {
          const handleContextMenu = (e) => {
               if (!isActive) return
               e.preventDefault()
               e.stopPropagation()
               recordViolation('right_click', 'Right-click context menu attempted')
               return false
          }

          const handleMouseDown = (e) => {
               if (!isActive) return
               // Detect right mouse button
               if (e.button === 2) {
                    e.preventDefault()
                    e.stopPropagation()
                    recordViolation('right_mouse_button', 'Right mouse button pressed')
                    return false
               }
          }

          const handleSelectStart = (e) => {
               if (!isActive) return
               e.preventDefault()
               e.stopPropagation()
               return false
          }

          const handleDragStart = (e) => {
               if (!isActive) return
               e.preventDefault()
               e.stopPropagation()
               recordViolation('drag_attempt', 'Drag operation attempted')
               return false
          }

          document.addEventListener('contextmenu', handleContextMenu, { capture: true, passive: false })
          document.addEventListener('mousedown', handleMouseDown, { capture: true, passive: false })
          document.addEventListener('selectstart', handleSelectStart, { capture: true, passive: false })
          document.addEventListener('dragstart', handleDragStart, { capture: true, passive: false })

          return () => {
               document.removeEventListener('contextmenu', handleContextMenu, { capture: true })
               document.removeEventListener('mousedown', handleMouseDown, { capture: true })
               document.removeEventListener('selectstart', handleSelectStart, { capture: true })
               document.removeEventListener('dragstart', handleDragStart, { capture: true })
          }
     }, [isActive, recordViolation])

     const setupClipboardPrevention = useCallback(() => {
          const handleCopy = (e) => {
               if (!isActive) return
               e.preventDefault()
               e.stopPropagation()
               recordViolation('clipboard_copy', 'Clipboard copy event triggered')
               return false
          }

          const handlePaste = (e) => {
               if (!isActive) return
               e.preventDefault()
               e.stopPropagation()
               recordViolation('clipboard_paste', 'Clipboard paste event triggered')
               return false
          }

          const handleCut = (e) => {
               if (!isActive) return
               e.preventDefault()
               e.stopPropagation()
               recordViolation('clipboard_cut', 'Clipboard cut event triggered')
               return false
          }

          document.addEventListener('copy', handleCopy, { capture: true, passive: false })
          document.addEventListener('paste', handlePaste, { capture: true, passive: false })
          document.addEventListener('cut', handleCut, { capture: true, passive: false })

          return () => {
               document.removeEventListener('copy', handleCopy, { capture: true })
               document.removeEventListener('paste', handlePaste, { capture: true })
               document.removeEventListener('cut', handleCut, { capture: true })
          }
     }, [isActive, recordViolation])

     const setupSecurityStyles = useCallback(() => {
          if (!isActive) return () => { }

          const style = document.createElement('style')
          style.id = 'exam-security-styles'
          style.textContent = `
      .exam-secure-content {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
        pointer-events: auto !important;
      }
      
      .exam-secure-content * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }

      /* Prevent text selection highlighting */
      .exam-secure-content *::selection {
        background: transparent !important;
      }
      
      .exam-secure-content *::-moz-selection {
        background: transparent !important;
      }

      /* Hide scrollbars to prevent right-click on them */
      .exam-secure-content::-webkit-scrollbar {
        display: none;
      }
      
      .exam-secure-content {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `
          document.head.appendChild(style)
          securityStylesRef.current = style

          return () => {
               if (securityStylesRef.current) {
                    securityStylesRef.current.remove()
                    securityStylesRef.current = null
               }
          }
     }, [isActive])

     const setupDevToolsDetection = useCallback(() => {
          if (!isActive) return () => { }

          let devtools = { open: false, orientation: null }

          const threshold = 160

          const detectDevTools = () => {
               if (window.outerHeight - window.innerHeight > threshold ||
                    window.outerWidth - window.innerWidth > threshold) {
                    if (!devtools.open) {
                         devtools.open = true
                         recordViolation('dev_tools_detected', 'Developer tools opened (window size detection)')
                    }
               } else {
                    devtools.open = false
               }
          }

          const interval = setInterval(detectDevTools, 1000)

          return () => {
               clearInterval(interval)
          }
     }, [isActive, recordViolation])

     // Main setup function
     const setupAntiCheating = useCallback(() => {
          if (!isActive) return

          // Clear any existing cleanup functions
          cleanupFunctionsRef.current.forEach(cleanup => cleanup())
          cleanupFunctionsRef.current = []

          // Setup all anti-cheating measures
          cleanupFunctionsRef.current.push(
               setupPageVisibilityMonitoring(),
               setupKeyboardPrevention(),
               setupMousePrevention(),
               setupClipboardPrevention(),
               setupSecurityStyles(),
               setupDevToolsDetection()
          )

          // Show activation message only once when first activated
          if (!hasShownInitialMessageRef.current) {
               toast.success('🔒 Secure exam mode activated. Anti-cheating monitoring is now active.', {
                    duration: 5000,
                    icon: '🔒'
               })
               hasShownInitialMessageRef.current = true
          }
     }, [
          isActive,
          setupPageVisibilityMonitoring,
          setupKeyboardPrevention,
          setupMousePrevention,
          setupClipboardPrevention,
          setupSecurityStyles,
          setupDevToolsDetection
     ])

     const cleanupAntiCheating = useCallback(() => {
          // Execute all cleanup functions
          cleanupFunctionsRef.current.forEach(cleanup => cleanup())
          cleanupFunctionsRef.current = []

          // Remove security styles
          if (securityStylesRef.current) {
               securityStylesRef.current.remove()
               securityStylesRef.current = null
          }

          // Reset the initial message flag when cleaning up
          hasShownInitialMessageRef.current = false
     }, [])

     // Setup when active, cleanup when inactive
     useEffect(() => {
          if (!isActive) {
               cleanupAntiCheating()
               return
          }

          // Clear any existing cleanup functions
          cleanupFunctionsRef.current.forEach(cleanup => cleanup())
          cleanupFunctionsRef.current = []

          // Setup all anti-cheating measures directly
          cleanupFunctionsRef.current.push(
               setupPageVisibilityMonitoring(),
               setupKeyboardPrevention(),
               setupMousePrevention(),
               setupClipboardPrevention(),
               setupSecurityStyles(),
               setupDevToolsDetection()
          )

          // Show activation message only once when first activated
          if (!hasShownInitialMessageRef.current) {
               toast.success('🔒 Secure exam mode activated. Anti-cheating monitoring is now active.', {
                    duration: 5000,
                    icon: '🔒'
               })
               hasShownInitialMessageRef.current = true
          }

          return cleanupAntiCheating
     }, [isActive]) // Only depend on isActive

     return {
          setupAntiCheating,
          cleanupAntiCheating
     }
}

export default useAntiCheating