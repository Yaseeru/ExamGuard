# Requirements Document

## Introduction

ExamGuard is a web-based online examination platform that enables educational institutions to conduct digital exams with built-in anti-cheating measures. The system supports role-based access control for Admins, Lecturers, and Students, providing comprehensive examination management from course creation to result analysis. The platform implements real-time anti-cheating detection using browser-based monitoring and violation tracking to maintain academic integrity.

## Glossary

- **ExamGuard_System**: The complete online examination platform
- **Admin**: System administrator with full user management privileges
- **Lecturer**: Course instructor who creates and manages courses and exams
- **Student**: Exam participant who registers for courses and takes exams
- **Course**: Academic subject container for exams and student enrollment
- **Exam**: Timed assessment containing multiple-choice questions
- **ExamAttempt**: Individual student session for taking a specific exam
- **Anti_Cheating_Engine**: Browser-based monitoring system for detecting violations
- **Violation**: Detected cheating behavior during exam session
- **JWT_Token**: JSON Web Token for secure user authentication
- **Tab_Switch**: Browser focus change event detected by Page Visibility API
- **Strike_System**: Three-warning mechanism before automatic exam submission

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As an educational institution, I want secure user authentication with role-based access control, so that only authorized users can access appropriate system functions.

#### Acceptance Criteria

1. WHEN a user provides valid credentials, THE ExamGuard_System SHALL authenticate the user using JWT_Token
2. THE ExamGuard_System SHALL encrypt all passwords using bcrypt before storage
3. WHEN a user logs in, THE ExamGuard_System SHALL assign role-based permissions (Admin, Lecturer, or Student)
4. THE ExamGuard_System SHALL maintain user sessions securely using JWT_Token validation
5. WHEN a JWT_Token expires, THE ExamGuard_System SHALL require re-authentication

### Requirement 2: Admin User Management

**User Story:** As an Admin, I want to manage all system users, so that I can control access and maintain the user database.

#### Acceptance Criteria

1. THE Admin SHALL create, read, update, and delete Student accounts
2. THE Admin SHALL create, read, update, and delete Lecturer accounts
3. WHEN managing users, THE Admin SHALL assign appropriate roles (Student or Lecturer)
4. THE Admin SHALL view comprehensive user lists with filtering capabilities
5. THE Admin SHALL NOT have access to take exams or create courses

### Requirement 3: Course Management

**User Story:** As a Lecturer, I want to create and manage courses, so that I can organize exams by academic subject.

#### Acceptance Criteria

1. THE Lecturer SHALL create new Course entities with title, description, and enrollment capacity
2. THE Lecturer SHALL update Course information including title, description, and capacity
3. THE Lecturer SHALL delete Course entities that have no active exams
4. THE Lecturer SHALL view all Course entities they have created
5. WHEN a Course is deleted, THE ExamGuard_System SHALL prevent deletion if active ExamAttempt records exist

### Requirement 4: Student Course Registration

**User Story:** As a Student, I want to browse and register for courses, so that I can participate in exams for subjects I'm studying.

#### Acceptance Criteria

1. THE Student SHALL view all available Course entities
2. WHEN a Student selects a Course, THE ExamGuard_System SHALL allow registration if capacity permits
3. THE Student SHALL view all Course entities they are registered for
4. WHEN Course capacity is reached, THE ExamGuard_System SHALL prevent additional registrations
5. THE Student SHALL unregister from Course entities before exam deadlines

### Requirement 5: Exam Creation and Management

**User Story:** As a Lecturer, I want to create and manage exams with multiple-choice questions, so that I can assess student knowledge.

#### Acceptance Criteria

1. THE Lecturer SHALL create Exam entities with title, duration, start time, and end time
2. THE Lecturer SHALL add multiple-choice questions to Exam entities with four options and one correct answer
3. THE Lecturer SHALL update Exam details including questions, timing, and availability
4. THE Lecturer SHALL delete Exam entities that have no ExamAttempt records
5. WHEN creating questions, THE ExamGuard_System SHALL require exactly four options with one marked as correct

### Requirement 6: Exam Taking Engine

**User Story:** As a Student, I want to take exams online with a timer, so that I can complete assessments within the allocated time.

#### Acceptance Criteria

1. WHEN an Exam is available, THE Student SHALL start an ExamAttempt session
2. THE ExamGuard_System SHALL display a countdown timer showing remaining exam time
3. THE Student SHALL select answers for multiple-choice questions during the ExamAttempt
4. WHEN the timer reaches zero, THE ExamGuard_System SHALL automatically submit the ExamAttempt
5. THE Student SHALL manually submit the ExamAttempt before time expiry
6. WHEN an ExamAttempt is submitted, THE ExamGuard_System SHALL prevent further modifications

### Requirement 7: Anti-Cheating Tab Switch Detection

**User Story:** As an educational institution, I want to detect when students switch browser tabs during exams, so that I can maintain academic integrity.

#### Acceptance Criteria

1. WHEN an ExamAttempt begins, THE Anti_Cheating_Engine SHALL monitor browser focus using Page Visibility API
2. WHEN a Tab_Switch is detected, THE Anti_Cheating_Engine SHALL record a Violation with timestamp
3. WHEN the first Violation occurs, THE ExamGuard_System SHALL display a warning message to the Student
4. WHEN the second Violation occurs, THE ExamGuard_System SHALL display a final warning message
5. WHEN the third Violation occurs, THE ExamGuard_System SHALL automatically submit the ExamAttempt
6. THE Anti_Cheating_Engine SHALL log all Violation events with timestamps for Lecturer review

### Requirement 8: Copy-Paste and Right-Click Prevention

**User Story:** As an educational institution, I want to prevent students from copying exam content or pasting external content, so that exam security is maintained.

#### Acceptance Criteria

1. DURING an ExamAttempt, THE ExamGuard_System SHALL disable right-click context menus
2. DURING an ExamAttempt, THE ExamGuard_System SHALL prevent copy operations (Ctrl+C)
3. DURING an ExamAttempt, THE ExamGuard_System SHALL prevent paste operations (Ctrl+V)
4. DURING an ExamAttempt, THE ExamGuard_System SHALL disable text selection of exam content
5. WHEN prevention measures are bypassed, THE Anti_Cheating_Engine SHALL record a Violation

### Requirement 9: Results Storage and Display

**User Story:** As a Student and Lecturer, I want to view exam results after submission, so that I can assess performance and provide feedback.

#### Acceptance Criteria

1. WHEN an ExamAttempt is submitted, THE ExamGuard_System SHALL calculate the score based on correct answers
2. THE ExamGuard_System SHALL store ExamAttempt results with score, answers, and violation count
3. THE Student SHALL view their own ExamAttempt results after submission
4. THE Lecturer SHALL view all ExamAttempt results for their Exam entities
5. THE Lecturer SHALL view Violation reports for each ExamAttempt including timestamps and types

### Requirement 10: Database Schema and Data Persistence

**User Story:** As a system administrator, I want reliable data storage using MongoDB, so that all exam data is preserved and accessible.

#### Acceptance Criteria

1. THE ExamGuard_System SHALL store User entities with authentication credentials and role information
2. THE ExamGuard_System SHALL store Course entities with enrollment data and Lecturer associations
3. THE ExamGuard_System SHALL store Exam entities with embedded questions and timing configuration
4. THE ExamGuard_System SHALL store ExamAttempt entities with answers, scores, and violation logs
5. WHEN data is modified, THE ExamGuard_System SHALL maintain referential integrity between collections

### Requirement 11: Frontend User Interface

**User Story:** As a user, I want an intuitive web interface built with React, so that I can easily navigate and use the system.

#### Acceptance Criteria

1. THE ExamGuard_System SHALL provide role-specific dashboards for Admin, Lecturer, and Student users
2. THE ExamGuard_System SHALL implement responsive design using Tailwind CSS for mobile and desktop access
3. THE ExamGuard_System SHALL use React Router for client-side navigation between pages
4. DURING ExamAttempt sessions, THE ExamGuard_System SHALL display real-time timer and question navigation
5. THE ExamGuard_System SHALL provide clear feedback messages for user actions and errors

### Requirement 12: API Backend Services

**User Story:** As a frontend application, I want RESTful API endpoints, so that I can communicate with the database and business logic.

#### Acceptance Criteria

1. THE ExamGuard_System SHALL provide authentication endpoints for login and token validation
2. THE ExamGuard_System SHALL provide CRUD endpoints for User, Course, and Exam management
3. THE ExamGuard_System SHALL provide exam-taking endpoints for starting, updating, and submitting ExamAttempt entities
4. THE ExamGuard_System SHALL provide results endpoints for retrieving scores and violation reports
5. WHEN API requests are made, THE ExamGuard_System SHALL validate JWT_Token authorization for protected endpoints

### Requirement 13: Deployment and Scalability

**User Story:** As an educational institution, I want the system deployed on reliable cloud services, so that it's accessible and scalable for our needs.

#### Acceptance Criteria

1. THE ExamGuard_System SHALL deploy the database on MongoDB Atlas cloud service
2. THE ExamGuard_System SHALL deploy the backend API on Render or Railway cloud platform
3. THE ExamGuard_System SHALL deploy the frontend application on Vercel or Netlify
4. THE ExamGuard_System SHALL handle concurrent exam sessions from multiple students
5. WHEN system load increases, THE ExamGuard_System SHALL maintain response times under 2 seconds for exam operations