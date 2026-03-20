const authService = require('../../services/authService');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

// Mock the User model
jest.mock('../../models/User');

describe('AuthService', () => {
     beforeEach(() => {
          jest.clearAllMocks();
     });

     describe('authenticateUser', () => {
          const mockUser = {
               _id: 'user123',
               email: 'test@example.com',
               name: 'Test User',
               role: 'Student',
               isActive: true,
               comparePassword: jest.fn(),
               toJSON: jest.fn().mockReturnValue({
                    _id: 'user123',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'Student'
               })
          };

          it('should authenticate user with valid credentials', async () => {
               User.findByEmail.mockResolvedValue(mockUser);
               mockUser.comparePassword.mockResolvedValue(true);

               const result = await authService.authenticateUser('test@example.com', 'password123');

               expect(result.success).toBe(true);
               expect(result.token).toBeDefined();
               expect(result.user).toEqual({
                    _id: 'user123',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'Student'
               });
          });

          it('should reject authentication with invalid email', async () => {
               User.findByEmail.mockResolvedValue(null);

               const result = await authService.authenticateUser('invalid@example.com', 'password123');

               expect(result.success).toBe(false);
               expect(result.error).toBe('Invalid credentials');
          });

          it('should reject authentication with invalid password', async () => {
               User.findByEmail.mockResolvedValue(mockUser);
               mockUser.comparePassword.mockResolvedValue(false);

               const result = await authService.authenticateUser('test@example.com', 'wrongpassword');

               expect(result.success).toBe(false);
               expect(result.error).toBe('Invalid credentials');
          });

          it('should reject authentication for inactive user', async () => {
               const inactiveUser = { ...mockUser, isActive: false };
               User.findByEmail.mockResolvedValue(inactiveUser);

               const result = await authService.authenticateUser('test@example.com', 'password123');

               expect(result.success).toBe(false);
               expect(result.error).toBe('Account is deactivated');
          });
     });

     describe('generateToken', () => {
          it('should generate valid JWT token with user claims', () => {
               const user = {
                    _id: 'user123',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'Student'
               };

               const token = authService.generateToken(user);
               const decoded = jwt.decode(token);

               expect(decoded.id).toBe('user123');
               expect(decoded.email).toBe('test@example.com');
               expect(decoded.name).toBe('Test User');
               expect(decoded.role).toBe('Student');
               expect(decoded.iss).toBe('examguard-system');
          });
     });

     describe('validateToken', () => {
          const mockUser = {
               _id: 'user123',
               isActive: true
          };

          it('should validate valid token', async () => {
               const user = {
                    _id: 'user123',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'Student'
               };

               const token = authService.generateToken(user);
               User.findById.mockResolvedValue(mockUser);

               const result = await authService.validateToken(token);

               expect(result.valid).toBe(true);
               expect(result.user.id).toBe('user123');
               expect(result.user.email).toBe('test@example.com');
               expect(result.user.role).toBe('Student');
          });

          it('should reject invalid token', async () => {
               const result = await authService.validateToken('invalid-token');

               expect(result.valid).toBe(false);
               expect(result.error).toBeDefined();
          });

          it('should reject token for non-existent user', async () => {
               const user = {
                    _id: 'user123',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'Student'
               };

               const token = authService.generateToken(user);
               User.findById.mockResolvedValue(null);

               const result = await authService.validateToken(token);

               expect(result.valid).toBe(false);
               expect(result.error).toBe('User not found or inactive');
          });

          it('should reject token for inactive user', async () => {
               const user = {
                    _id: 'user123',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'Student'
               };

               const token = authService.generateToken(user);
               User.findById.mockResolvedValue({ ...mockUser, isActive: false });

               const result = await authService.validateToken(token);

               expect(result.valid).toBe(false);
               expect(result.error).toBe('User not found or inactive');
          });
     });

     describe('extractTokenFromHeader', () => {
          it('should extract token from valid Bearer header', () => {
               const token = authService.extractTokenFromHeader('Bearer abc123token');
               expect(token).toBe('abc123token');
          });

          it('should return null for invalid header format', () => {
               expect(authService.extractTokenFromHeader('Invalid header')).toBeNull();
               expect(authService.extractTokenFromHeader('')).toBeNull();
               expect(authService.extractTokenFromHeader(null)).toBeNull();
          });
     });

     describe('hashPassword', () => {
          it('should hash password using bcrypt', async () => {
               const password = 'testpassword123';
               const hash = await authService.hashPassword(password);

               expect(hash).toBeDefined();
               expect(hash).not.toBe(password);
               expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
          });
     });

     describe('comparePassword', () => {
          it('should return true for matching password and hash', async () => {
               const password = 'testpassword123';
               const hash = await authService.hashPassword(password);

               const result = await authService.comparePassword(password, hash);
               expect(result).toBe(true);
          });

          it('should return false for non-matching password and hash', async () => {
               const password = 'testpassword123';
               const wrongPassword = 'wrongpassword';
               const hash = await authService.hashPassword(password);

               const result = await authService.comparePassword(wrongPassword, hash);
               expect(result).toBe(false);
          });
     });
});