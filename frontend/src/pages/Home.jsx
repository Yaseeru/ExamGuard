import { Link } from 'react-router-dom'
import { Shield, Users, BookOpen, Clock, Eye } from 'lucide-react'

const Home = () => {
  const features = [
    {
      icon: Shield,
      title: 'Anti-Cheating Protection',
      description: 'Advanced browser monitoring and violation detection system'
    },
    {
      icon: Users,
      title: 'Role-Based Access',
      description: 'Separate interfaces for Admins, Lecturers, and Students'
    },
    {
      icon: BookOpen,
      title: 'Course Management',
      description: 'Easy course creation and student enrollment system'
    },
    {
      icon: Clock,
      title: 'Timed Examinations',
      description: 'Automatic submission with real-time countdown timers'
    },
    {
      icon: Eye,
      title: 'Real-time Monitoring',
      description: 'Live violation tracking and comprehensive reporting'
    }
  ]

  return (
    <div className="bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Secure Online
            <span className="text-primary-600"> Examinations</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            ExamGuard provides a comprehensive platform for conducting secure online exams 
            with advanced anti-cheating measures and real-time monitoring.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="btn-primary text-lg px-8 py-3">
              Get Started
            </Link>
            <button className="btn-secondary text-lg px-8 py-3">
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose ExamGuard?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Built with security and user experience in mind, ExamGuard ensures 
            academic integrity while providing a seamless examination experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="card text-center">
              <feature.icon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Secure Your Examinations?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join educational institutions worldwide in maintaining academic integrity.
            </p>
            <Link to="/login" className="bg-white text-primary-600 hover:bg-gray-100 font-medium py-3 px-8 rounded-lg transition-colors duration-200">
              Start Your Free Trial
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home