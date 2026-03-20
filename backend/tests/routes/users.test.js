// Set JWT secret for testing before importing modules
process.env.JWT_SECRET = 'test-secret-key';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const authService = require('../../services/authService');

describe('User Routes', () => {
     let adminToken;
     let lecturerToken;
     let studentToken;
     let adminUser;
     let lecturerUser;
     let studentUser;

     beforeEach(async () => {
          // Clear database
          await User.deleteMany({});

          // Create test users
          adminUser = await User.create({
               name: 'Admin User',
               email: 'admin@example.com',
               password: 'Password123',
               role: 'Admin'
          });

          lecturerUser = await User.create({
               name: 'Lecturer User',
               email: 'lecturer@example.com',
               password: 'Password123',
               role: 'Lecturer'
          });

          studentUser = await User.create({
               name: 'Student User',
               email: 'student@example.com',
               password: 'Password123',
               role: 'Student'
          });

          // Generate tokens
          adminToken = authService.generateToken(adminUser);
          lecturerToken = authService.generateToken(lecturerUser);
          studentToken = authService.generateToken(studentUser);
     });

     describe('GET /api/users', () => {
          test('should get all users as admin', async () => {
               const response = await request(app)
                    .get('/api/users')
                    .set('Authorization', `Bearer ${adminToken}`);

               expect(response.status).toBe(200);
               expect(response.body.success).toBe(true);
               expect(response.body.users).toBeDefined();
               expect(response.body.count).toBeGreaterThan(0);
          });

          test('should filter users by role', async () => {
               const response = await request(app)
                    .get('/api/users?role=Student')
                    .set('Authorization', `Bearer ${adminToken}`);

               expect(response.status).toBe(200);
               expect(response.body.success).toBe(true);
               expect(response.body.users.every(user => user.role === 'Student')).toBe(true);
          });

          test('should fail with invalid role filter', async () => {
               const response = await request(app)
                    .get('/api/users?role=InvalidRole')
                    .set('Authorization', `Bearer ${adminToken}`);

               expect(response.status).toBe(400);
               expect(response.body.error.code).toBe('VALIDATION_ERROR');
          });

          test('should deny access to non-admin users', async () => {
               const response = await request(app)
                    .get('/api/users')
                    .set('Authorization', `Bearer ${lecturerToken}`);

               expect(response.status).toBe(403);
               expect(response.body.error.code).toBe('FORBIDDEN');
          });

          test('should deny access without authentication', async () => {
               const response = await request(app)
                    .get('/api/users');

               expect(response.status).toBe(401);
               expect(response.body.error.code).toBe('MISSING_TOKEN');
          });
     });

     describe('GET /api/users/stats', () => {
          test('should get user statistics as admin', async () => {
               const response = await request(app)
                    .get('/api/users/stats')
                    .set('Authorization', `Bearer ${adminToken}`);

               expect(response.status).toBe(200);
               expect(response.body.success).toBe(true);
               expect(response.body.stats).toBeDefined();
               expect(response.body.stats.total).toBeGreaterThan(0);
               expect(response.body.stats.Admin).toBeGreaterThan(0);
          });

          test('should deny access to non-admin users', async () => {
               const response = await request(app)
                    .get('/api/users/stats')
                    .set('Authorization', `Bearer ${studentToken}`);

               expect(response.status).toBe(403);
               expect(response.body.error.code).toBe('FORBIDDEN');
          });
     });

     describe('GET /api/users/:id', () => {
          let testUser;

          beforeEach(async () => {
               testUser = await User.create({
                    name: 'Test User',
                    email: 'testuser@example.com',
                    password: 'Password123',
                    role: 'Student'
               });
          });

          test('should get user by ID as admin', async () => {
               const response = await request(app)
                    .get(`/api/users/${testUser._id}`)
                    .set('Authorization', `Bearer ${adminToken}`);

               expect(response.status).toBe(200);
               expect(response.body.success).toBe(true);
               expect(response.body.user.name).toBe(testUser.name);
               expect(response.body.user.password).toBeUndefined();
          });

          test('should fail with invalid user ID format', async () => {
               const response = await request(app)
                    .get('/api/users/invalid-id')
                    .set('Authorization', `Bearer ${adminToken}`);

               expect(response.status).toBe(400);
               expect(response.body.error.code).toBe('VALIDATION_ERROR');
          });

          test('should fail with non-existent user ID', async () => {
               const nonExistentId = new mongoose.Types.ObjectId();
               const response = await request(app)
                    .get(`/api/users/${nonExistentId}`)
                    .set('Authorization', `Bearer ${adminToken}`);

               expect(response.status).toBe(404);
               expect(response.body.error.code).toBe('USER_NOT_FOUND');
          });
     });

     describe('POST /api/users', () => {
          const validUserData = {
               name: 'New User',
               email: 'newuser@example.com',
               password: 'Password123',
               role: 'Student'
          };

          test('should create new user as admin', async () => {
               const response = await request(app)
                    .post('/api/users')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(validUserData);

               expect(response.status).toBe(201);
               expect(response.body.success).toBe(true);
               expect(response.body.user.name).toBe(validUserData.name);
               expect(response.body.user.email).toBe(validUserData.email);
               expect(response.body.user.role).toBe(validUserData.role);
               expect(response.body.user.password).toBeUndefined();
          });

          test('should fail with invalid user data', async () => {
               const invalidData = {
                    name: 'A', // Too short
                    email: 'invalid-email',
                    password: '123', // Too short
                    role: 'InvalidRole'
               };

               const response = await request(app)
                    .post('/api/users')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(invalidData);

               expect(response.status).toBe(400);
               expect(response.body.error.code).toBe('VALIDATION_ERROR');
               expect(response.body.error.details).toBeDefined();
          });

          test('should fail with duplicate email', async () => {
               // Create first user
               await request(app)
                    .post('/api/users')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(validUserData);

               // Try to create second user with same email
               const response = await request(app)
                    .post('/api/users')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ ...validUserData, name: 'Another User' });

               expect(response.status).toBe(400);
               expect(response.body.error.code).toBe('USER_CREATION_ERROR');
          });

          test('should deny access to non-admin users', async () => {
               const response = await request(app)
                    .post('/api/users')
                    .set('Authorization', `Bearer ${lecturerToken}`)
                    .send(validUserData);

               expect(response.status).toBe(403);
               expect(response.body.error.code).toBe('FORBIDDEN');
          });
     });

     describe('PUT /api/users/:id', () => {
          let testUser;

          beforeEach(async () => {
               testUser = await User.create({
                    name: 'Test User',
                    email: 'testuser@example.com',
                    password: 'Password123',
                    role: 'Student'
               });
          });

          test('should update user as admin', async () => {
               const updateData = {
                    name: 'Updated Name',
                    role: 'Lecturer'
               };

               const response = await request(app)
                    .put(`/api/users/${testUser._id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(updateData);

               expect(response.status).toBe(200);
               expect(response.body.success).toBe(true);
               expect(response.body.user.name).toBe(updateData.name);
               expect(response.body.user.role).toBe(updateData.role);
          });

          test('should fail with invalid update data', async () => {
               const invalidData = {
                    name: 'A', // Too short
                    role: 'InvalidRole'
               };

               const response = await request(app)
                    .put(`/api/users/${testUser._id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(invalidData);

               expect(response.status).toBe(400);
               expect(response.body.error.code).toBe('VALIDATION_ERROR');
          });

          test('should fail with non-existent user ID', async () => {
               const nonExistentId = new mongoose.Types.ObjectId();
               const response = await request(app)
                    .put(`/api/users/${nonExistentId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ name: 'Updated Name' });

               expect(response.status).toBe(404);
               expect(response.body.error.code).toBe('USER_UPDATE_ERROR');
          });
     });

     describe('DELETE /api/users/:id', () => {
          let testUser;

          beforeEach(async () => {
               testUser = await User.create({
                    name: 'Test User',
                    email: 'testuser@example.com',
                    password: 'Password123',
                    role: 'Student'
               });
          });

          test('should delete user as admin', async () => {
               const response = await request(app)
                    .delete(`/api/users/${testUser._id}`)
                    .set('Authorization', `Bearer ${adminToken}`);

               expect(response.status).toBe(200);
               expect(response.body.success).toBe(true);
               expect(response.body.message).toContain('deleted successfully');

               // Verify user is soft deleted
               const deletedUser = await User.findById(testUser._id);
               expect(deletedUser.isActive).toBe(false);
          });

          test('should prevent admin from deleting themselves', async () => {
               const response = await request(app)
                    .delete(`/api/users/${adminUser._id}`)
                    .set('Authorization', `Bearer ${adminToken}`);

               expect(response.status).toBe(400);
               expect(response.body.error.code).toBe('SELF_DELETE_ERROR');
          });

          test('should fail with non-existent user ID', async () => {
               const nonExistentId = new mongoose.Types.ObjectId();
               const response = await request(app)
                    .delete(`/api/users/${nonExistentId}`)
                    .set('Authorization', `Bearer ${adminToken}`);

               expect(response.status).toBe(404);
               expect(response.body.error.code).toBe('USER_DELETE_ERROR');
          });

          test('should deny access to non-admin users', async () => {
               const response = await request(app)
                    .delete(`/api/users/${testUser._id}`)
                    .set('Authorization', `Bearer ${studentToken}`);

               expect(response.status).toBe(403);
               expect(response.body.error.code).toBe('FORBIDDEN');
          });
     });
});