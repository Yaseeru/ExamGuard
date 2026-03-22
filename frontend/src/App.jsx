import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/Common'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import LecturerDashboard from './pages/LecturerDashboard'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import { StudentDashboard, ExamInterface } from './components/Student'

function App() {
  return (
    <ErrorBoundary fallbackMessage="The ExamGuard application encountered an unexpected error. Please refresh the page to continue.">
      <AuthProvider>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Only Routes */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Lecturer Only Routes */}
            <Route 
              path="/lecturer/*" 
              element={
                <ProtectedRoute requiredRole="Lecturer">
                  <LecturerDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Student Only Routes */}
            <Route 
              path="/student/*" 
              element={
                <ProtectedRoute requiredRole="Student">
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Exam Taking Route */}
            <Route 
              path="/student/exam/:attemptId" 
              element={
                <ErrorBoundary fallbackMessage="An error occurred while loading the exam. Please contact your instructor for assistance.">
                  <ProtectedRoute requiredRole="Student">
                    <ExamInterface />
                  </ProtectedRoute>
                </ErrorBoundary>
              } 
            />
            
            {/* Catch-all route for 404 */}
            <Route 
              path="*" 
              element={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
                    <p className="text-gray-600">The page you're looking for doesn't exist.</p>
                  </div>
                </div>
              } 
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App