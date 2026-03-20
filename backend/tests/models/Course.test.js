const User = require('../../models/User');
const Course = require('../../models/Course');

describe('Course Model', () => {
     let lecturer;
     let students;

     beforeEach(async () => {
          await User.deleteMany({});
          await Course.deleteMany({});

          // Create test lecturer
          lecturer = new User({
               name: 'Dr Smith',
               email: 'dr.smith@example.com',
               password: 'Password123',
               role: 'Lecturer'
          });
          await lecturer.save();

          // Create test students
          students = await User.insertMany([
               { name: 'Student One', email: 'student1@example.com', password: 'Password123', role: 'Student' },
               { name: 'Student Two', email: 'student2@example.com', password: 'Password123', role: 'Student' },
               { name: 'Student Three', email: 'student3@example.com', password: 'Password123', role: 'Student' }
          ]);
     });

     describe('Course Creation', () => {
          it('should create a valid course with all required fields', async () => {
               const courseData = {
                    title: 'Introduction to Computer Science',
                    description: 'A comprehensive introduction to computer science fundamentals',
                    lecturerId: lecturer._id,
                    capacity: 30
               };

               const course = new Course(courseData);
               const savedCourse = await course.save();

               expect(savedCourse._id).toBeDefined();
               expect(savedCourse.title).toBe(courseData.title);
               expect(savedCourse.description).toBe(courseData.description);
               expect(savedCourse.lecturerId.toString()).toBe(lecturer._id.toString());
               expect(savedCourse.capacity).toBe(courseData.capacity);
               expect(savedCourse.enrolledStudents).toHaveLength(0);
               expect(savedCourse.isActive).toBe(true);
               expect(savedCourse.createdAt).toBeDefined();
               expect(savedCourse.updatedAt).toBeDefined();
          });

          it('should validate lecturer role', async () => {
               const student = students[0];
               const courseData = {
                    title: 'Test Course',
                    description: 'Test course description',
                    lecturerId: student._id, // Student instead of lecturer
                    capacity: 20
               };

               const course = new Course(courseData);
               await expect(course.save()).rejects.toThrow('Lecturer ID must reference a valid user with Lecturer role');
          });
     });

     describe('Course Validation', () => {
          it('should require title field', async () => {
               const courseData = {
                    description: 'Test course description',
                    lecturerId: lecturer._id,
                    capacity: 20
               };

               const course = new Course(courseData);
               await expect(course.save()).rejects.toThrow('Course title is required');
          });

          it('should require description field', async () => {
               const courseData = {
                    title: 'Test Course',
                    lecturerId: lecturer._id,
                    capacity: 20
               };

               const course = new Course(courseData);
               await expect(course.save()).rejects.toThrow('Course description is required');
          });

          it('should validate title format and length', async () => {
               const invalidTitles = [
                    'AB',                    // Too short
                    'A'.repeat(101),         // Too long
                    'Course@Title!'          // Invalid characters
               ];

               for (const title of invalidTitles) {
                    const courseData = {
                         title,
                         description: 'Valid description here',
                         lecturerId: lecturer._id,
                         capacity: 20
                    };

                    const course = new Course(courseData);
                    await expect(course.save()).rejects.toThrow();
               }
          });

          it('should validate description length', async () => {
               const invalidDescriptions = [
                    'Short',                 // Too short
                    'A'.repeat(501)          // Too long
               ];

               for (const description of invalidDescriptions) {
                    const courseData = {
                         title: 'Valid Course Title',
                         description,
                         lecturerId: lecturer._id,
                         capacity: 20
                    };

                    const course = new Course(courseData);
                    await expect(course.save()).rejects.toThrow();
               }
          });

          it('should validate capacity range', async () => {
               const invalidCapacities = [0, -1, 1001, 1.5];

               for (const capacity of invalidCapacities) {
                    const courseData = {
                         title: 'Test Course',
                         description: 'Test course description',
                         lecturerId: lecturer._id,
                         capacity
                    };

                    const course = new Course(courseData);
                    await expect(course.save()).rejects.toThrow();
               }
          });

          it('should prevent enrollment exceeding capacity', async () => {
               const courseData = {
                    title: 'Small Course',
                    description: 'A course with limited capacity',
                    lecturerId: lecturer._id,
                    capacity: 2,
                    enrolledStudents: [students[0]._id, students[1]._id, students[2]._id] // 3 students for capacity of 2
               };

               const course = new Course(courseData);
               await expect(course.save()).rejects.toThrow('Enrollment count (3) exceeds course capacity (2)');
          });
     });

     describe('Course Virtual Properties', () => {
          let course;

          beforeEach(async () => {
               course = new Course({
                    title: 'Test Course',
                    description: 'Test course description',
                    lecturerId: lecturer._id,
                    capacity: 5,
                    enrolledStudents: [students[0]._id, students[1]._id]
               });
               await course.save();
          });

          it('should calculate current enrollment correctly', () => {
               expect(course.currentEnrollment).toBe(2);
          });

          it('should calculate available spots correctly', () => {
               expect(course.availableSpots).toBe(3);
          });
     });

     describe('Course Instance Methods', () => {
          let course;

          beforeEach(async () => {
               course = new Course({
                    title: 'Test Course',
                    description: 'Test course description',
                    lecturerId: lecturer._id,
                    capacity: 3
               });
               await course.save();
          });

          it('should check if student is enrolled', () => {
               expect(course.isStudentEnrolled(students[0]._id)).toBe(false);

               course.enrolledStudents.push(students[0]._id);
               expect(course.isStudentEnrolled(students[0]._id)).toBe(true);
          });

          it('should enroll student successfully', async () => {
               await course.enrollStudent(students[0]._id);

               expect(course.enrolledStudents).toHaveLength(1);
               expect(course.isStudentEnrolled(students[0]._id)).toBe(true);
          });

          it('should prevent duplicate enrollment', async () => {
               await course.enrollStudent(students[0]._id);

               try {
                    await course.enrollStudent(students[0]._id);
                    fail('Should have thrown an error');
               } catch (error) {
                    expect(error.message).toBe('Student is already enrolled in this course');
               }
          });

          it('should prevent enrollment when capacity is reached', async () => {
               // Fill to capacity
               await course.enrollStudent(students[0]._id);
               await course.enrollStudent(students[1]._id);
               await course.enrollStudent(students[2]._id);

               // Try to enroll one more
               const extraStudent = new User({
                    name: 'Extra Student',
                    email: 'extra@example.com',
                    password: 'Password123',
                    role: 'Student'
               });
               await extraStudent.save();

               try {
                    await course.enrollStudent(extraStudent._id);
                    fail('Should have thrown an error');
               } catch (error) {
                    expect(error.message).toBe('Course has reached maximum capacity');
               }
          });

          it('should unenroll student successfully', async () => {
               await course.enrollStudent(students[0]._id);
               expect(course.enrolledStudents).toHaveLength(1);

               await course.unenrollStudent(students[0]._id);
               expect(course.enrolledStudents).toHaveLength(0);
               expect(course.isStudentEnrolled(students[0]._id)).toBe(false);
          });

          it('should prevent unenrolling non-enrolled student', async () => {
               try {
                    await course.unenrollStudent(students[0]._id);
                    fail('Should have thrown an error');
               } catch (error) {
                    expect(error.message).toBe('Student is not enrolled in this course');
               }
          });
     });

     describe('Course Static Methods', () => {
          let courses;

          beforeEach(async () => {
               courses = await Course.insertMany([
                    {
                         title: 'Course One',
                         description: 'First course description',
                         lecturerId: lecturer._id,
                         capacity: 20,
                         enrolledStudents: [students[0]._id]
                    },
                    {
                         title: 'Course Two',
                         description: 'Second course description',
                         lecturerId: lecturer._id,
                         capacity: 15,
                         enrolledStudents: [students[0]._id, students[1]._id]
                    }
               ]);
          });

          it('should find courses by lecturer', async () => {
               const lecturerCourses = await Course.findByLecturer(lecturer._id);

               expect(lecturerCourses).toHaveLength(2);
               // Check the actual lecturerId field, not the populated one
               expect(lecturerCourses.every(course => course.lecturerId._id.toString() === lecturer._id.toString())).toBe(true);
          });

          it('should find courses by student', async () => {
               const studentCourses = await Course.findByStudent(students[0]._id);

               expect(studentCourses).toHaveLength(2);
               expect(studentCourses.every(course =>
                    course.enrolledStudents.some(id => id.toString() === students[0]._id.toString())
               )).toBe(true);

               const student2Courses = await Course.findByStudent(students[1]._id);
               expect(student2Courses).toHaveLength(1);
          });
     });
});