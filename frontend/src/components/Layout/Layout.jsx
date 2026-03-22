import Header from './Header'
import Footer from './Footer'
import AccessibilityProvider from '../Common/AccessibilityProvider'

const Layout = ({ children }) => {
  return (
    <AccessibilityProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main id="main-content" className="flex-1" tabIndex="-1">
          {children}
        </main>
        <Footer />
      </div>
    </AccessibilityProvider>
  )
}

export default Layout