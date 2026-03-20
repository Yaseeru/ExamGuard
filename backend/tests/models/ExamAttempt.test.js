const User = require('../../models/User');
const Course = require('../../models/Course');
const Exam = require('../../models/Exam');
const ExamAttempt = require('../../models/ExamAttempt');

describe('ExamAttempt Model', () => {
     let lecturer;
     let student;
     let course;
     let exam;

     beforeEach(async () => {
          await User.deleteMany({});
          await Course.deleteMany({});
          await Exam.deleteMany({});
          await ExamAttempt.deleteMany({});

          // Create test lecturer
          lecturer = new User({
               name: 'Dr Smith',
               email: 'dr.smith@example.com',
               password: 'Password123',
               role: 'Lecturer'
          });
          await lecturer.save();

          // Create test student
          student = new User({
               name: 'John Student',
               email: 'john@example.com',
               password: 'Password123',
               role: 'Student'
          });
          await student.save();

          // Create test course
          course = new Course({
               title: 'Test Course',
               description: 'Test course description',
               lecturerId: lecturer._id,
               capacity: 30,
               enrolledStudents: [student._id]
          });
          await course.save();

          // Create test exam
          exam = new Exam({
               title: 'Test Exam',
               courseId: course._id,
               duration: 60,
               startTime: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
               endTime: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
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

     describe('ExamAttempt Creation', () => {
          it('should create a valid exam attempt with all required fields', async () => {
               const attemptData = {
                    examId: exam._id,
                    studentId: student._id
               };

               const attempt = new ExamAttempt(attemptData);
               const savedAttempt = await attempt.save();

               expect(savedAttempt._id).toBeDefined();
               expect(savedAttempt.examId.toString()).toBe(exam._id.toString());
               expect(savedAttempt.studentId.toString()).toBe(student._id.toString());
               expect(savedAttempt.startTime).toBeDefined();
               expect(savedAttempt.status).toBe('in_progress');
               expect(savedAttempt.violationCount).toBe(0);
               expect(savedAttempt.answers).toHaveLength(0);
               expect(savedAttempt.violations).toHaveLength(0);
               expect(savedAttempt.totalQuestions).toBe(2); // From exam
               expect(savedAttempt.timeRemaining).toBe(3600); // 60 minutes in seconds
          });

          it('should validate student role', async () => {
               const attemptData = {
                    examId: exam._id,
                    studentId: lecturer._id // Lecturer instead of student
               };

               const attempt = new ExamAttempt(attemptData);
               await expect(attempt.save()).rejects.toThrow('Student ID must reference a valid user with Student role');
          });
     });

     describe('ExamAttempt Validation', () => {
          it('should require examId field', async () => {
               const attemptData = {
                    studentId: student._id
               };

               const attempt = new ExamAttempt(attemptData);
               await expect(attempt.save()).rejects.toThrow('Exam ID is required');
          });

          it('should require studentId field', async () => {
               const attemptData = {
                    examId: exam._id
               };

               const attempt = new ExamAttempt(attemptData);
               await expect(attempt.save()).rejects.toThrow('Student ID is required');
          });

          it('should validate status enum', async () => {
               const attemptData = {
                    examId: exam._id,
                    studentId: student._id,
                    status: 'invalid_status'
               };

               const attempt = new ExamAttempt(attemptData);
               await expect(attempt.save()).rejects.toThrow('Invalid exam attempt status');
          });

          it('should validate violation count limits', async () => {
               const attemptData = {
                    examId: exam._id,
                    studentId: student._id,
                    violationCount: 5 // Exceeds maximum of 3
               };

               const attempt = new ExamAttempt(attemptData);
               await expect(attempt.save()).rejects.toThrow('Violation count cannot exceed 3');
          });
     });

     describe('ExamAttempt Instance Methods', () => {
          let attempt;

          beforeEach(async () => {
               attempt = new ExamAttempt({
                    examId: exam._id,
                    studentId: student._id
               });
               await attempt.save();
          });

          it('should record answer successfully', async () => {
               const questionId = exam.questions[0]._id;
               await attempt.recordAnswer(questionId, 1);

               expect(attempt.answers).toHaveLength(1);
               expect(attempt.answers[0].questionId.toString()).toBe(questionId.toString());
               expect(attempt.answers[0].selectedOption).toBe(1);
               expect(attempt.answers[0].answeredAt).toBeDefined();
          });

          it('should update existing answer', async () => {
               const questionId = exam.questions[0]._id;

               // Record initial answer
               await attempt.recordAnswer(questionId, 0);
               expect(attempt.answers).toHaveLength(1);
               expect(attempt.answers[0].selectedOption).toBe(0);

               // Update answer
               await attempt.recordAnswer(questionId, 2);
               expect(attempt.answers).toHaveLength(1);
               expect(attempt.answers[0].selectedOption).toBe(2);
          });

          it('should validate selected option range', async () => {
               const questionId = exam.questions[0]._id;

               try {
                    await attempt.recordAnswer(questionId, -1);
                    fail('Should have thrown an error');
               } catch (error) {
                    expect(error.message).toBe('Selected option must be between 0 and 3');
               }

               try {
                    await attempt.recordAnswer(questionId, 4);
                    fail('Should have thrown an error');
               } catch (error) {
                    expect(error.message).toBe('Selected option must be between 0 and 3');
               }
          });

          it('should record violation successfully', async () => {
               await attempt.recordViolation('tab_switch', 'User switched to another tab');

               expect(attempt.violations).toHaveLength(1);
               expect(attempt.violationCount).toBe(1);
               expect(attempt.violations[0].type).toBe('tab_switch');
               expect(attempt.violations[0].details).toBe('User switched to another tab');
               expect(attempt.violations[0].timestamp).toBeDefined();
               expect(attempt.status).toBe('in_progress');
          });

          it('should auto-submit after 3 violations', async () => {
               // Record 3 violations
               await attempt.recordViolation('tab_switch', 'First violation');
               await attempt.recordViolation('copy_attempt', 'Second violation');
               await attempt.recordViolation('paste_attempt', 'Third violation');

               expect(attempt.violationCount).toBe(3);
               expect(attempt.status).toBe('auto_submitted');
               expect(attempt.submittedAt).toBeDefined();
               expect(attempt.endTime).toBeDefined();
          });

          it('should submit attempt successfully', async () => {
               // Record some answers first
               await attempt.recordAnswer(exam.questions[0]._id, 1); // Correct
               await attempt.recordAnswer(exam.questions[1]._id, 0); // Incorrect

               await attempt.submit();

               expect(attempt.status).toBe('submitted');
               expect(attempt.submittedAt).toBeDefined();
               expect(attempt.endTime).toBeDefined();
               expect(attempt.score).toBe(1); // Only first question correct (1 point)
          });

          it('should prevent submission of already completed attempt', async () => {
               await attempt.submit();

               await expect(attempt.submit()).rejects.toThrow('Exam attempt is already completed');
          });

          it('should get answer for specific question', () => {
               const questionId = exam.questions[0]._id;
               attempt.answers.push({
                    questionId,
                    selectedOption: 2,
                    answeredAt: new Date()
               });

               const answer = attempt.getAnswerForQuestion(questionId);
               expect(answer).toBeTruthy();
               expect(answer.selectedOption).toBe(2);

               const nonExistentAnswer = attempt.getAnswerForQuestion(exam.questions[1]._id);
               expect(nonExistentAnswer).toBeUndefined();
          });

          it('should get violation summary', async () => {
               await attempt.recordViolation('tab_switch', 'First tab switch');
               await attempt.recordViolation('tab_switch', 'Second tab switch');
               await attempt.recordViolation('copy_attempt', 'Copy attempt');

               const summary = attempt.getViolationSummary();
               expect(summary.total).toBe(3);
               expect(summary.byType.tab_switch).toBe(2);
               expect(summary.byType.copy_attempt).toBe(1);
          });
     });

     describe('ExamAttempt Virtual Properties', () => {
          let attempt;

          beforeEach(async () => {
               attempt = new ExamAttempt({
                    examId: exam._id,
                    studentId: student._id
               });
               await attempt.save();
          });

          it('should check if attempt is active', () => {
               expect(attempt.isActive).toBe(true);

               attempt.status = 'submitted';
               expect(attempt.isActive).toBe(false);
          });

          it('should check if attempt is completed', () => {
               expect(attempt.isCompleted).toBe(false);

               attempt.status = 'submitted';
               expect(attempt.isCompleted).toBe(true);

               attempt.status = 'auto_submitted';
               expect(attempt.isCompleted).toBe(true);

               attempt.status = 'expired';
               expect(attempt.isCompleted).toBe(true);
          });

          it('should calculate duration in minutes', () => {
               expect(attempt.durationMinutes).toBeNull();

               attempt.endTime = new Date(attempt.startTime.getTime() + 30 * 60 * 1000); // 30 minutes later
               expect(attempt.durationMinutes).toBe(30);
          });
     });

     describe('ExamAttempt Static Methods', () => {
          let attempts;

          beforeEach(async () => {
               // Create another student and exam for testing
               const student2 = new User({
                    name: 'Jane Student',
                    email: 'jane@example.com',
                    password: 'Password123',
                    role: 'Student'
               });
               await student2.save();

               attempts = await ExamAttempt.insertMany([
                    {
                         examId: exam._id,
                         studentId: student._id,
                         status: 'submitted'
                    },
                    {
                         examId: exam._id,
                         studentId: student2._id,
                         status: 'in_progress'
                    }
               ]);
          });

          it('should find attempts by student', async () => {
               const studentAttempts = await ExamAttempt.findByStudent(student._id);
               expect(studentAttempts).toHaveLength(1);
               expect(studentAttempts[0].studentId.toString()).toBe(student._id.toString());
          });

          it('should find attempts by exam', async () => {
               const examAttempts = await ExamAttempt.findByExam(exam._id);
               expect(examAttempts).toHaveLength(2);
               expect(examAttempts.every(attempt => attempt.examId.toString() === exam._id.toString())).toBe(true);
          });

          it('should find attempts by status', async () => {
               const submittedAttempts = await ExamAttempt.findByStudent(student._id, 'submitted');
               expect(submittedAttempts).toHaveLength(1);
               expect(submittedAttempts[0].status).toBe('submitted');
          });

          it('should check for existing attempt', async () => {
               const existingAttempt = await ExamAttempt.hasExistingAttempt(exam._id, student._id);
               expect(existingAttempt).toBeTruthy();

               const nonExistentAttempt = await ExamAttempt.hasExistingAttempt(exam._id, lecturer._id);
               expect(nonExistentAttempt).toBeNull();
          });
     });
});