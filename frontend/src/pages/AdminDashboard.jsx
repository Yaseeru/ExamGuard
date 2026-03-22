import { Routes, Route, Navigate } from 'react-router-dom'
import { UserManagement } from '../components/Admin'

const AdminDashboard = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Routes>
        <Route path="/" element={<Navigate to="/admin/users" replace />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="*" element={
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
            <p className="text-gray-600">The admin page you're looking for doesn't exist.</p>
          </div>
        } />
      </Routes>
    </div>
  )
}

export default AdminDashboard