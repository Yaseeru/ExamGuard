const mongoose = require('mongoose');
const User = require('../../models/User');
const Course = require('../../models/Course');
const Exam = require('../../models/Exam');

describe('Exam Model', () => {
     let lecturer;
     let course;
     let students;

     beforeEach(async () => {
          await User.deleteMany({});
          await Course.deleteMany({});
          await Exam.deleteMany({});

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
               { name: 'Student Two', email: 'student2@example.com', password: 'Password123', role: 'Student' }
          ]);

          // Create test course
          course = new Course({
               title: 'Test Course',
               description: 'Test course description',
               lecturerId: lecturer._id,
               capacity: 30,
               enrolledStudents: [students[0]._id, students[1]._id]
          });
          await course.save();
     });

     describe('Exam Creation', () => {
          it('should create a valid exam with all required fields', async () => {
               const examData = {
                    title: 'Midterm Exam',
                    courseId: course._id,
                    duration: 90,
                    startTime: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
                    endTime: new Date(Date.now() + 1000 * 60 * 60 * 3), // 3 hours from now
                    questions: [
                         {
                              questionText: 'What is 2 + 2?',
                              options: ['3', '4', '5', '6'],
                              correctAnswer: 1,
                              points: 1
                         },
                         {
                              questionText: 'What is the capital of France?',
                              options: ['London', 'Berlin', 'Paris', 'Madrid'],
                              correctAnswer: 2,
                              points: 2
                         }
                    ]
               };

               const exam = new Exam(examData);
               const savedExam = await exam.save();

               expect(savedExam._id).toBeDefined();
               expect(savedExam.title).toBe(examData.title);
               expect(savedExam.courseId.toString()).toBe(course._id.toString());
               expect(savedExam.duration).toBe(examData.duration);
               expect(savedExam.questions).toHaveLength(2);
               expect(savedExam.totalPoints).toBe(3); // 1 + 2 points
               expect(savedExam.isActive).toBe(true);
               expect(savedExam.createdAt).toBeDefined();
               expect(savedExam.updatedAt).toBeDefined();
          });

          it('should validate course reference', async () => {
               const examData = {
                    title: 'Test Exam',
                    courseId: new mongoose.Types.ObjectId(), // Non-existent course
                    duration: 60,
                    startTime: new Date(Date.now() + 1000 * 60 * 60),
                    endTime: new Date(Date.now() + 1000 * 60 * 60 * 2),
                    questions: [{
                         questionText: 'Test question?',
                         options: ['A', 'B', 'C', 'D'],
                         correctAnswer: 0
                    }]
               };

               const exam = new Exam(examData);
               await expect(exam.save()).rejects.toThrow('Course ID must reference a valid active course');
          });
     });

     describe('Exam Validation', () => {
          it('should require title field', async () => {
               const examData = {
                    courseId: course._id,
                    duration: 60,
                    startTime: new Date(Date.now() + 1000 * 60 * 60),
                    endTime: new Date(Date.now() + 1000 * 60 * 60 * 2),
                    questions: [{
                         questionText: 'Test question?',
                         options: ['A', 'B', 'C', 'D'],
                         correctAnswer: 0
                    }]
               };

               const exam = new Exam(examData);
               await expect(exam.save()).rejects.toThrow('Exam title is required');
          });

          it('should validate title length', async () => {
               const invalidTitles = [
                    'AB', // Too short
                    'A'.repeat(101) // Too long
               ];

               for (const title of invalidTitles) {
                    const examData = {
                         title,
                         courseId: course._id,
                         duration: 60,
                         startTime: new Date(Date.now() + 1000 * 60 * 60),
                         endTime: new Date(Date.now() + 1000 * 60 * 60 * 2),
                         questions: [{
                              questionText: 'Test question?',
                              options: ['A', 'B', 'C', 'D'],
                              correctAnswer: 0
                         }]
                    };

                    const exam = new Exam(examData);
                    await expect(exam.save()).rejects.toThrow();
               }
          });

          it('should validate duration range', async () => {
               const invalidDurations = [4, 301, 1.5]; // Too short, too long, not integer

               for (const duration of invalidDurations) {
                    const examData = {
                         title: 'Test Exam',
                         courseId: course._id,
                         duration,
                         startTime: new Date(Date.now() + 1000 * 60 * 60),
                         endTime: new Date(Date.now() + 1000 * 60 * 60 * 2),
                         questions: [{
                              questionText: 'Test question?',
                              options: ['A', 'B', 'C', 'D'],
                              correctAnswer: 0
                         }]
                    };

                    const exam = new Exam(examData);
                    await expect(exam.save()).rejects.toThrow();
               }
          });

          it('should validate end time is after start time', async () => {
               const startTime = new Date(Date.now() + 1000 * 60 * 60);
               const endTime = new Date(startTime.getTime() - 1000 * 60 * 30); // 30 minutes before start

               const examData = {
                    title: 'Test Exam',
                    courseId: course._id,
                    duration: 60,
                    startTime,
                    endTime,
                    questions: [{
                         questionText: 'Test question?',
                         options: ['A', 'B', 'C', 'D'],
                         correctAnswer: 0
                    }]
               };

               const exam = new Exam(examData);
               await expect(exam.save()).rejects.toThrow('End time must be after start time');
          });

          it('should validate questions format', async () => {
               const invalidQuestions = [
                    [], // No questions
                    [{
                         questionText: 'Short?', // Too short
                         options: ['A', 'B', 'C', 'D'],
                         correctAnswer: 0
                    }],
                    [{
                         questionText: 'Valid question text here?',
                         options: ['A', 'B', 'C'], // Only 3 options
                         correctAnswer: 0
                    }],
                    [{
                         questionText: 'Valid question text here?',
                         options: ['A', 'B', 'C', 'D'],
                         correctAnswer: 4 // Invalid index
                    }]
               ];

               for (const questions of invalidQuestions) {
                    const examData = {
                         title: 'Test Exam',
                         courseId: course._id,
                         duration: 60,
                         startTime: new Date(Date.now() + 1000 * 60 * 60),
                         endTime: new Date(Date.now() + 1000 * 60 * 60 * 2),
                         questions
                    };

                    const exam = new Exam(examData);
                    await expect(exam.save()).rejects.toThrow();
               }
          });
     });

     describe('Exam Virtual Properties', () => {
          let exam;

          beforeEach(async () => {
               exam = new Exam({
                    title: 'Test Exam',
                    courseId: course._id,
                    duration: 60,
                    startTime: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
                    endTime: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes from now
                    questions: [{
                         questionText: 'Test question?',
                         options: ['A', 'B', 'C', 'D'],
                         correctAnswer: 0
                    }]
               });
               await exam.save();
          });

          it('should check if exam is available', () => {
               expect(exam.isAvailable).toBe(true);
          });

          it('should check if exam is upcoming', () => {
               exam.startTime = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
               expect(exam.isUpcoming).toBe(true);
          });

          it('should check if exam has ended', () => {
               exam.endTime = new Date(Date.now() - 1000 * 60 * 30); // 30 minutes ago
               expect(exam.hasEnded).toBe(true);
          });
     });

     describe('Exam Instance Methods', () => {
          let exam;

          beforeEach(async () => {
               exam = new Exam({
                    title: 'Test Exam',
                    courseId: course._id,
                    duration: 60,
                    startTime: new Date(Date.now() - 1000 * 60 * 30),
                    endTime: new Date(Date.now() + 1000 * 60 * 30),
                    questions: [
                         {
                              questionText: 'What is 2 + 2?',
                              options: ['3', '4', '5', '6'],
                              correctAnswer: 1,
                              points: 1
                         },
                         {
                              questionText: 'What is the capital of France?',
                              options: ['London', 'Berlin', 'Paris', 'Madrid'],
                              correctAnswer: 2,
                              points: 2
                         }
                    ]
               });
               await exam.save();
          });

          it('should get question by ID', () => {
               const questionId = exam.questions[0]._id;
               const question = exam.getQuestionById(questionId);

               expect(question).toBeTruthy();
               expect(question.questionText).toBe('What is 2 + 2?');
          });

          it('should validate answer', () => {
               const questionId = exam.questions[0]._id;

               expect(exam.validateAnswer(questionId, 1)).toBe(true); // Correct answer
               expect(exam.validateAnswer(questionId, 0)).toBe(false); // Incorrect answer

               expect(() => exam.validateAnswer(questionId, 4)).toThrow('Selected option must be between 0 and 3');
          });

          it('should calculate score for given answers', () => {
               const answers = [
                    { questionId: exam.questions[0]._id, selectedOption: 1 }, // Correct (1 point)
                    { questionId: exam.questions[1]._id, selectedOption: 0 }  // Incorrect (0 points)
               ];

               const result = exam.calculateScore(answers);

               expect(result.score).toBe(1);
               expect(result.totalPoints).toBe(3);
               expect(result.correctAnswers).toBe(1);
               expect(result.totalQuestions).toBe(2);
               expect(result.percentage).toBeCloseTo(33.33, 2);
          });
     });

     describe('Exam Static Methods', () => {
          let exams;

          beforeEach(async () => {
               exams = await Exam.insertMany([
                    {
                         title: 'Exam One',
                         courseId: course._id,
                         duration: 60,
                         startTime: new Date(Date.now() - 1000 * 60 * 60),
                         endTime: new Date(Date.now() + 1000 * 60 * 60),
                         questions: [{
                              questionText: 'Test question 1?',
                              options: ['A', 'B', 'C', 'D'],
                              correctAnswer: 0
                         }]
                    },
                    {
                         title: 'Exam Two',
                         courseId: course._id,
                         duration: 90,
                         startTime: new Date(Date.now() + 1000 * 60 * 60),
                         endTime: new Date(Date.now() + 1000 * 60 * 60 * 3),
                         questions: [{
                              questionText: 'Test question 2?',
                              options: ['A', 'B', 'C', 'D'],
                              correctAnswer: 1
                         }]
                    }
               ]);
          });

          it('should find exams by course', async () => {
               const courseExams = await Exam.findByCourse(course._id);

               expect(courseExams).toHaveLength(2);
               // Check the actual courseId field, not the populated one
               expect(courseExams.every(exam => exam.courseId._id.toString() === course._id.toString())).toBe(true);
          });

          it('should find available exams for student', async () => {
               const availableExams = await Exam.findAvailableForStudent(students[0]._id);

               expect(availableExams).toHaveLength(1); // Only first exam is currently available
               expect(availableExams[0].title).toBe('Exam One');
          });

          it('should find upcoming exams for student', async () => {
               const upcomingExams = await Exam.findUpcomingForStudent(students[0]._id);

               expect(upcomingExams).toHaveLength(1); // Only second exam is upcoming
               expect(upcomingExams[0].title).toBe('Exam Two');
          });
     });
});