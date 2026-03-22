import { useState, useEffect, useCallback } from 'react'

const useResponsive = () => {
     const [screenSize, setScreenSize] = useState({
          width: typeof window !== 'undefined' ? window.innerWidth : 1024,
          height: typeof window !== 'undefined' ? window.innerHeight : 768
     })

     const [orientation, setOrientation] = useState(
          typeof window !== 'undefined' && window.innerWidth > window.innerHeight
               ? 'landscape'
               : 'portrait'
     )

     // Breakpoints based on Tailwind CSS defaults
     const breakpoints = {
          sm: 640,
          md: 768,
          lg: 1024,
          xl: 1280,
          '2xl': 1536
     }

     // Update screen size and orientation
     const updateScreenInfo = useCallback(() => {
          const width = window.innerWidth
          const height = window.innerHeight

          setScreenSize({ width, height })
          setOrientation(width > height ? 'landscape' : 'portrait')
     }, [])

     // Set up resize listener
     useEffect(() => {
          if (typeof window === 'undefined') return

          updateScreenInfo()

          const handleResize = () => {
               updateScreenInfo()
          }

          window.addEventListener('resize', handleResize)
          return () => window.removeEventListener('resize', handleResize)
     }, [updateScreenInfo])

     // Breakpoint checkers
     const isMobile = screenSize.width < breakpoints.md
     const isTablet = screenSize.width >= breakpoints.md && screenSize.width < breakpoints.lg
     const isDesktop = screenSize.width >= breakpoints.lg
     const isLargeDesktop = screenSize.width >= breakpoints.xl

     // Specific breakpoint checks
     const isSmallScreen = screenSize.width < breakpoints.sm
     const isMediumScreen = screenSize.width >= breakpoints.sm && screenSize.width < breakpoints.md
     const isLargeScreen = screenSize.width >= breakpoints.md && screenSize.width < breakpoints.lg
     const isExtraLargeScreen = screenSize.width >= breakpoints.lg && screenSize.width < breakpoints.xl
     const is2XLScreen = screenSize.width >= breakpoints['2xl']

     // Utility functions
     const isBreakpoint = useCallback((breakpoint) => {
          return screenSize.width >= breakpoints[breakpoint]
     }, [screenSize.width])

     const isBetweenBreakpoints = useCallback((min, max) => {
          return screenSize.width >= breakpoints[min] && screenSize.width < breakpoints[max]
     }, [screenSize.width])

     // Get current breakpoint
     const getCurrentBreakpoint = useCallback(() => {
          if (screenSize.width >= breakpoints['2xl']) return '2xl'
          if (screenSize.width >= breakpoints.xl) return 'xl'
          if (screenSize.width >= breakpoints.lg) return 'lg'
          if (screenSize.width >= breakpoints.md) return 'md'
          if (screenSize.width >= breakpoints.sm) return 'sm'
          return 'xs'
     }, [screenSize.width])

     // Device type detection
     const getDeviceType = useCallback(() => {
          if (isMobile) return 'mobile'
          if (isTablet) return 'tablet'
          return 'desktop'
     }, [isMobile, isTablet])

     // Check if device supports touch
     const isTouchDevice = useCallback(() => {
          return 'ontouchstart' in window || navigator.maxTouchPoints > 0
     }, [])

     // Check if device is in portrait mode
     const isPortrait = orientation === 'portrait'
     const isLandscape = orientation === 'landscape'

     // Get responsive value based on current breakpoint
     const getResponsiveValue = useCallback((values) => {
          const currentBreakpoint = getCurrentBreakpoint()

          // If values is not an object, return as is
          if (typeof values !== 'object' || values === null) {
               return values
          }

          // Check for exact breakpoint match
          if (values[currentBreakpoint] !== undefined) {
               return values[currentBreakpoint]
          }

          // Fallback to smaller breakpoints
          const breakpointOrder = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
          const currentIndex = breakpointOrder.indexOf(currentBreakpoint)

          for (let i = currentIndex; i < breakpointOrder.length; i++) {
               const bp = breakpointOrder[i]
               if (values[bp] !== undefined) {
                    return values[bp]
               }
          }

          // Final fallback to default
          return values.default || values[Object.keys(values)[0]]
     }, [getCurrentBreakpoint])

     // Generate responsive classes
     const getResponsiveClasses = useCallback((classMap) => {
          const classes = []

          Object.entries(classMap).forEach(([breakpoint, className]) => {
               if (breakpoint === 'default' || breakpoint === 'xs') {
                    classes.push(className)
               } else if (isBreakpoint(breakpoint)) {
                    classes.push(`${breakpoint}:${className}`)
               }
          })

          return classes.join(' ')
     }, [isBreakpoint])

     // Check if screen is small enough to show mobile menu
     const shouldShowMobileMenu = isMobile || (isTablet && isPortrait)

     // Check if screen is large enough for sidebar
     const shouldShowSidebar = isDesktop

     // Get grid columns based on screen size
     const getGridColumns = useCallback((mobileColumns = 1, tabletColumns = 2, desktopColumns = 3) => {
          if (isMobile) return mobileColumns
          if (isTablet) return tabletColumns
          return desktopColumns
     }, [isMobile, isTablet])

     return {
          // Screen information
          screenSize,
          orientation,
          breakpoints,

          // Device type checks
          isMobile,
          isTablet,
          isDesktop,
          isLargeDesktop,
          isTouchDevice: isTouchDevice(),

          // Specific breakpoint checks
          isSmallScreen,
          isMediumScreen,
          isLargeScreen,
          isExtraLargeScreen,
          is2XLScreen,

          // Orientation
          isPortrait,
          isLandscape,

          // Utility functions
          isBreakpoint,
          isBetweenBreakpoints,
          getCurrentBreakpoint,
          getDeviceType,
          getResponsiveValue,
          getResponsiveClasses,
          getGridColumns,

          // Common responsive patterns
          shouldShowMobileMenu,
          shouldShowSidebar
     }
}

export default useResponsive