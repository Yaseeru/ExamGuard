const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Course = require('../../models/Course');
const authService = require('../../services/authService');

describe('Course Routes', () => {
     let lecturer, student;
     let lecturerToken, studentToken;
     let testCourse;

     beforeEach(async () => {
          // Clear database
          await User.deleteMany({});
          await Course.deleteMany({});

          // Create test users
          lecturer = new User({
               name: 'Dr. Smith',
               email: 'lecturer@example.com',
               password: 'Password123',
               role: 'Lecturer'
          });
          await lecturer.save();

          student = new User({
               name: 'John Student',
               email: 'student@example.com',
               password: 'Password123',
               role: 'Student'
          });
          await student.save();

          // Generate tokens
          lecturerToken = authService.generateToken(lecturer);
          studentToken = authService.generateToken(student);

          // Create test course
          testCourse = new Course({
               title: 'Introduction to Computer Science',
               description: 'A comprehensive introduction to computer science fundamentals',
               lecturerId: lecturer._id,
               capacity: 30
          });
          await testCourse.save();
     });

     describe('GET /api/courses', () => {
          it('should return available courses for students', async () => {
               const response = await request(app)
                    .get('/api/courses')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .expect(200);

               expect(response.body.success).toBe(true);
               expect(response.body.courses).toHaveLength(1);
               expect(response.body.courses[0].title).toBe(testCourse.title);
          });

          it('should return owned courses for lecturers', async () => {
               const response = await request(app)
                    .get('/api/courses')
                    .set('Authorization', `Bearer ${lecturerToken}`)
                    .expect(200);

               expect(response.body.success).toBe(true);
               expect(response.body.courses).toHaveLength(1);
               expect(response.body.courses[0].title).toBe(testCourse.title);
          });

          it('should require authentication', async () => {
               await request(app)
                    .get('/api/courses')
                    .expect(401);
          });
     });

     describe('POST /api/courses', () => {
          const validCourseData = {
               title: 'Advanced Mathematics',
               description: 'Advanced mathematical concepts and applications',
               capacity: 25
          };

          it('should create course for lecturers', async () => {
               const response = await request(app)
                    .post('/api/courses')
                    .set('Authorization', `Bearer ${lecturerToken}`)
                    .send(validCourseData)
                    .expect(201);

               expect(response.body.success).toBe(true);
               expect(response.body.message).toBe('Course created successfully');
               expect(response.body.course.title).toBe(validCourseData.title);
          });

          it('should require lecturer role', async () => {
               await request(app)
                    .post('/api/courses')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send(validCourseData)
                    .expect(403);
          });
     });

     describe('POST /api/courses/:id/enroll', () => {
          it('should enroll student in course', async () => {
               const response = await request(app)
                    .post(`/api/courses/${testCourse._id}/enroll`)
                    .set('Authorization', `Bearer ${studentToken}`)
                    .expect(201);

               expect(response.body.success).toBe(true);
               expect(response.body.message).toBe('Student enrolled successfully');

               // Verify enrollment in database
               const updatedCourse = await Course.findById(testCourse._id);
               expect(updatedCourse.enrolledStudents.map(id => id.toString())).toContain(student._id.toString());
          });

          it('should require student role', async () => {
               await request(app)
                    .post(`/api/courses/${testCourse._id}/enroll`)
                    .set('Authorization', `Bearer ${lecturerToken}`)
                    .expect(403);
          });
     });

     describe('GET /api/courses/enrolled', () => {
          beforeEach(async () => {
               // Enroll student in course
               testCourse.enrolledStudents.push(student._id);
               await testCourse.save();
          });

          it('should return enrolled courses for students', async () => {
               const response = await request(app)
                    .get('/api/courses/enrolled')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .expect(200);

               expect(response.body.success).toBe(true);
               expect(response.body.courses).toHaveLength(1);
               expect(response.body.courses[0].title).toBe(testCourse.title);
          });

          it('should require student role', async () => {
               await request(app)
                    .get('/api/courses/enrolled')
                    .set('Authorization', `Bearer ${lecturerToken}`)
                    .expect(403);
          });
     });
});