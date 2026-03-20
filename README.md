# ExamGuard - Online Examination System

ExamGuard is a comprehensive web-based examination platform built on the MERN stack (MongoDB, Express.js, React.js, Node.js) that enables educational institutions to conduct secure online exams with robust anti-cheating measures.

## Features

- **Role-Based Access Control**: Separate interfaces for Admins, Lecturers, and Students
- **Anti-Cheating Protection**: Advanced browser monitoring and violation detection
- **Course Management**: Easy course creation and student enrollment system
- **Timed Examinations**: Automatic submission with real-time countdown timers
- **Real-time Monitoring**: Live violation tracking and comprehensive reporting
- **Secure Authentication**: JWT-based authentication with bcrypt password encryption

## Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcrypt** for password hashing
- **Jest** for testing

### Frontend
- **React.js** with Vite build tool
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **Vitest** for testing

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd examguard-system
   ```

2. **Install dependencies**
   ```bash
   npm run install-deps
   ```

3. **Environment Setup**
   
   **Backend (.env)**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your MongoDB URI and JWT secret
   ```
   
   **Frontend (.env)**:
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your API URL
   ```

4. **Start the development servers**
   ```bash
   # From root directory - starts both backend and frontend
   npm run dev
   
   # Or start individually:
   npm run server  # Backend only (port 5000)
   npm run client  # Frontend only (port 5173)
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - API Health Check: http://localhost:5000/api/health

## Project Structure

```
examguard-system/
├── backend/                 # Express.js API server
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   ├── tests/              # Test files
│   └── server.js           # Entry point
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
└── package.json            # Root package.json
```

## Development

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Run all tests
npm test
```

### Building for Production
```bash
# Build frontend
npm run build

# Start production server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/validate` - Token validation

### User Management (Admin)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Courses
- `GET /api/courses` - Get courses
- `POST /api/courses` - Create course
- `POST /api/courses/:id/enroll` - Enroll in course

### Exams
- `GET /api/exams` - Get exams
- `POST /api/exams` - Create exam
- `POST /api/exam-attempts` - Start exam attempt
- `PUT /api/exam-attempts/:id/answer` - Submit answer
- `POST /api/exam-attempts/:id/submit` - Submit exam

## Security Features

### Anti-Cheating Measures
- **Tab Switch Detection**: Monitors browser focus using Page Visibility API
- **Copy-Paste Prevention**: Disables copy/paste operations during exams
- **Right-Click Disabling**: Prevents context menu access
- **Three-Strike System**: Automatic exam submission after 3 violations
- **Violation Logging**: Comprehensive tracking of all cheating attempts

### Authentication & Authorization
- JWT-based authentication with secure token storage
- Role-based access control (Admin, Lecturer, Student)
- Password encryption using bcrypt
- Protected API routes with middleware validation

## Deployment

### Backend Deployment (Render/Railway)
1. Create account on Render or Railway
2. Connect your repository
3. Set environment variables
4. Deploy with automatic builds

### Frontend Deployment (Vercel/Netlify)
1. Create account on Vercel or Netlify
2. Connect your repository
3. Set build command: `cd frontend && npm run build`
4. Set publish directory: `frontend/dist`

### Database (MongoDB Atlas)
1. Create MongoDB Atlas account
2. Create cluster and database
3. Get connection string
4. Update MONGODB_URI in environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository or contact the development team.