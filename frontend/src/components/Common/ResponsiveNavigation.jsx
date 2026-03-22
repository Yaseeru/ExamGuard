import React, { useState, useRef, useEffect } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import useResponsive from '../../hooks/useResponsive'
import useAccessibility from '../../hooks/useAccessibility'

const ResponsiveNavigation = ({ 
  items = [], 
  currentPath = '',
  onNavigate,
  className = '',
  brand,
  actions
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openDropdowns, setOpenDropdowns] = useState({})
  
  const { isMobile, isTablet } = useResponsive()
  const { 
    setupFocusTrap, 
    removeFocusTrap, 
    handleArrowNavigation,
    generateId,
    announce
  } = useAccessibility()
  
  const mobileMenuRef = useRef(null)
  const menuButtonRef = useRef(null)

  const shouldShowMobileMenu = isMobile || isTablet

  // Setup focus trap for mobile menu
  useEffect(() => {
    if (isMobileMenuOpen && shouldShowMobileMenu && mobileMenuRef.current) {
      const cleanup = setupFocusTrap(mobileMenuRef)
      return cleanup
    } else {
      removeFocusTrap()
    }
  }, [isMobileMenuOpen, shouldShowMobileMenu, setupFocusTrap, removeFocusTrap])

  // Close mobile menu on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMobileMenuOpen])

  // Close mobile menu when screen size changes
  useEffect(() => {
    if (!shouldShowMobileMenu && isMobileMenuOpen) {
      setIsMobileMenuOpen(false)
    }
  }, [shouldShowMobileMenu, isMobileMenuOpen])

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen
    setIsMobileMenuOpen(newState)
    announce(newState ? 'Menu opened' : 'Menu closed')
  }

  const toggleDropdown = (itemId) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const handleItemClick = (item, event) => {
    if (item.children) {
      event.preventDefault()
      toggleDropdown(item.id)
    } else {
      if (onNavigate) {
        onNavigate(item.path, item)
      }
      setIsMobileMenuOpen(false)
      setOpenDropdowns({})
    }
  }

  const handleKeyNavigation = (event, items, currentIndex) => {
    handleArrowNavigation(event, items, currentIndex, (newIndex) => {
      const item = items[newIndex]
      if (item) {
        const element = document.getElementById(`nav-item-${item.id}`)
        element?.focus()
      }
    })
  }

  const renderNavItem = (item, index, isInDropdown = false) => {
    const isActive = currentPath === item.path
    const hasChildren = item.children && item.children.length > 0
    const isDropdownOpen = openDropdowns[item.id]
    const itemId = `nav-item-${item.id}`

    const baseClasses = `
      flex items-center justify-between w-full px-3 py-2 rounded-lg text-left
      transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
      ${isActive 
        ? 'bg-blue-100 text-blue-900 font-medium' 
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }
      ${isInDropdown ? 'pl-8 text-sm' : ''}
    `

    return (
      <li key={item.id} className={isInDropdown ? '' : 'relative'}>
        <button
          id={itemId}
          className={baseClasses}
          onClick={(e) => handleItemClick(item, e)}
          onKeyDown={(e) => handleKeyNavigation(e, items, index)}
          aria-expanded={hasChildren ? isDropdownOpen : undefined}
          aria-haspopup={hasChildren ? 'menu' : undefined}
          aria-current={isActive ? 'page' : undefined}
        >
          <span className="flex items-center">
            {item.icon && (
              <item.icon className="h-5 w-5 mr-3" aria-hidden="true" />
            )}
            {item.label}
          </span>
          {hasChildren && (
            <ChevronDown 
              className={`h-4 w-4 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          )}
        </button>

        {hasChildren && isDropdownOpen && (
          <ul 
            className="mt-1 space-y-1"
            role="menu"
            aria-labelledby={itemId}
          >
            {item.children.map((child, childIndex) => 
              renderNavItem(child, childIndex, true)
            )}
          </ul>
        )}
      </li>
    )
  }

  return (
    <nav className={`bg-white shadow-sm border-b ${className}`} role="navigation" aria-label="Main navigation">
      <div className="container-responsive">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          {brand && (
            <div className="flex-shrink-0">
              {brand}
            </div>
          )}

          {/* Desktop Navigation */}
          {!shouldShowMobileMenu && (
            <div className="hidden md:block flex-1 mx-8">
              <ul className="flex space-x-1" role="menubar">
                {items.map((item, index) => (
                  <li key={item.id} role="none">
                    <button
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        ${currentPath === item.path
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                      onClick={(e) => handleItemClick(item, e)}
                      onKeyDown={(e) => handleKeyNavigation(e, items, index)}
                      aria-current={currentPath === item.path ? 'page' : undefined}
                      role="menuitem"
                    >
                      {item.icon && (
                        <item.icon className="h-4 w-4 mr-2 inline" aria-hidden="true" />
                      )}
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}

          {/* Mobile Menu Button */}
          {shouldShowMobileMenu && (
            <button
              ref={menuButtonRef}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        {shouldShowMobileMenu && isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            id="mobile-menu"
            className="md:hidden border-t border-gray-200 py-4"
            role="menu"
            aria-labelledby="mobile-menu-button"
          >
            <ul className="space-y-1" role="none">
              {items.map((item, index) => renderNavItem(item, index))}
            </ul>

            {/* Mobile Actions */}
            {actions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-col space-y-2">
                  {actions}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {shouldShowMobileMenu && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </nav>
  )
}

export default ResponsiveNavigation