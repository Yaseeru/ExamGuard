const request = require('supertest');
const express = require('express');
const authRoutes = require('../../routes/auth');
const authService = require('../../services/authService');

// Mock the authService
jest.mock('../../services/authService');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
     beforeEach(() => {
          jest.clearAllMocks();
     });

     describe('POST /api/auth/login', () => {
          const validLoginData = {
               email: 'test@example.com',
               password: 'Password123'
          };

          it('should login user with valid credentials', async () => {
               const mockResult = {
                    success: true,
                    token: 'jwt-token-123',
                    user: {
                         id: 'user123',
                         email: 'test@example.com',
                         name: 'Test User',
                         role: 'Student'
                    }
               };

               authService.authenticateUser.mockResolvedValue(mockResult);

               const response = await request(app)
                    .post('/api/auth/login')
                    .send(validLoginData);

               expect(response.status).toBe(200);
               expect(response.body.success).toBe(true);
               expect(response.body.token).toBe('jwt-token-123');
               expect(response.body.user).toEqual(mockResult.user);
               expect(authService.authenticateUser).toHaveBeenCalledWith(
                    'test@example.com',
                    'Password123'
               );
          });

          it('should return 401 for invalid credentials', async () => {
               const mockResult = {
                    success: false,
                    error: 'Invalid credentials'
               };

               authService.authenticateUser.mockResolvedValue(mockResult);

               const response = await request(app)
                    .post('/api/auth/login')
                    .send(validLoginData);

               expect(response.status).toBe(401);
               expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
               expect(response.body.error.message).toBe('Invalid credentials');
          });

          it('should return 400 for invalid email format', async () => {
               const invalidData = {
                    email: 'invalid-email',
                    password: 'Password123'
               };

               const response = await request(app)
                    .post('/api/auth/login')
                    .send(invalidData);

               expect(response.status).toBe(400);
               expect(response.body.error.code).toBe('VALIDATION_ERROR');
               expect(response.body.error.details).toEqual(
                    expect.arrayContaining([
                         expect.objectContaining({
                              msg: 'Please provide a valid email address'
                         })
                    ])
               );
          });

          it('should return 400 for missing password', async () => {
               const invalidData = {
                    email: 'test@example.com'
               };

               const response = await request(app)
                    .post('/api/auth/login')
                    .send(invalidData);

               expect(response.status).toBe(400);
               expect(response.body.error.code).toBe('VALIDATION_ERROR');
               expect(response.body.error.details).toEqual(
                    expect.arrayContaining([
                         expect.objectContaining({
                              msg: 'Password is required'
                         })
                    ])
               );
          });

          it('should return 400 for short password', async () => {
               const invalidData = {
                    email: 'test@example.com',
                    password: '123'
               };

               const response = await request(app)
                    .post('/api/auth/login')
                    .send(invalidData);

               expect(response.status).toBe(400);
               expect(response.body.error.code).toBe('VALIDATION_ERROR');
               expect(response.body.error.details).toEqual(
                    expect.arrayContaining([
                         expect.objectContaining({
                              msg: 'Password must be at least 8 characters long'
                         })
                    ])
               );
          });
     });

     describe('POST /api/auth/validate', () => {
          it('should validate token and return user data', async () => {
               const mockUser = {
                    id: 'user123',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'Student'
               };

               // Mock the middleware behavior
               authService.extractTokenFromHeader.mockReturnValue('valid-token');
               authService.validateToken.mockResolvedValue({
                    valid: true,
                    user: mockUser
               });

               const response = await request(app)
                    .post('/api/auth/validate')
                    .set('Authorization', 'Bearer valid-token');

               expect(response.status).toBe(200);
               expect(response.body.valid).toBe(true);
               expect(response.body.user).toEqual(mockUser);
          });

          it('should return 401 for missing token', async () => {
               authService.extractTokenFromHeader.mockReturnValue(null);

               const response = await request(app)
                    .post('/api/auth/validate');

               expect(response.status).toBe(401);
               expect(response.body.error.code).toBe('MISSING_TOKEN');
          });
     });

     describe('GET /api/auth/me', () => {
          it('should return current user profile', async () => {
               const mockUser = {
                    id: 'user123',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'Student'
               };

               authService.extractTokenFromHeader.mockReturnValue('valid-token');
               authService.validateToken.mockResolvedValue({
                    valid: true,
                    user: mockUser
               });

               const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', 'Bearer valid-token');

               expect(response.status).toBe(200);
               expect(response.body.success).toBe(true);
               expect(response.body.user).toEqual(mockUser);
          });
     });

     describe('POST /api/auth/logout', () => {
          it('should logout user successfully', async () => {
               const mockUser = {
                    id: 'user123',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'Student'
               };

               authService.extractTokenFromHeader.mockReturnValue('valid-token');
               authService.validateToken.mockResolvedValue({
                    valid: true,
                    user: mockUser
               });

               const response = await request(app)
                    .post('/api/auth/logout')
                    .set('Authorization', 'Bearer valid-token');

               expect(response.status).toBe(200);
               expect(response.body.success).toBe(true);
               expect(response.body.message).toBe('Logout successful');
          });
     });
});