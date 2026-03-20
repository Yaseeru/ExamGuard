const {
     authenticateToken,
     authorizeRoles,
     requireAdmin,
     requireLecturer,
     requireStudent,
     requireOwnershipOrAdmin
} = require('../../middleware/auth');
const authService = require('../../services/authService');

// Mock the authService
jest.mock('../../services/authService');

describe('Auth Middleware', () => {
     let req, res, next;

     beforeEach(() => {
          req = {
               headers: {},
               user: null,
               params: {},
               body: {}
          };
          res = {
               status: jest.fn().mockReturnThis(),
               json: jest.fn()
          };
          next = jest.fn();
          jest.clearAllMocks();
     });

     describe('authenticateToken', () => {
          it('should authenticate valid token and add user to request', async () => {
               const mockUser = {
                    id: 'user123',
                    email: 'test@example.com',
                    role: 'Student',
                    name: 'Test User'
               };

               req.headers.authorization = 'Bearer valid-token';
               authService.extractTokenFromHeader.mockReturnValue('valid-token');
               authService.validateToken.mockResolvedValue({
                    valid: true,
                    user: mockUser
               });

               await authenticateToken(req, res, next);

               expect(req.user).toEqual(mockUser);
               expect(next).toHaveBeenCalled();
               expect(res.status).not.toHaveBeenCalled();
          });

          it('should return 401 for missing token', async () => {
               authService.extractTokenFromHeader.mockReturnValue(null);

               await authenticateToken(req, res, next);

               expect(res.status).toHaveBeenCalledWith(401);
               expect(res.json).toHaveBeenCalledWith({
                    error: {
                         code: 'MISSING_TOKEN',
                         message: 'Access token is required',
                         timestamp: expect.any(String)
                    }
               });
               expect(next).not.toHaveBeenCalled();
          });

          it('should return 401 for invalid token', async () => {
               req.headers.authorization = 'Bearer invalid-token';
               authService.extractTokenFromHeader.mockReturnValue('invalid-token');
               authService.validateToken.mockResolvedValue({
                    valid: false,
                    error: 'Token expired'
               });

               await authenticateToken(req, res, next);

               expect(res.status).toHaveBeenCalledWith(401);
               expect(res.json).toHaveBeenCalledWith({
                    error: {
                         code: 'INVALID_TOKEN',
                         message: 'Token expired',
                         timestamp: expect.any(String)
                    }
               });
               expect(next).not.toHaveBeenCalled();
          });
     });

     describe('authorizeRoles', () => {
          beforeEach(() => {
               req.user = {
                    id: 'user123',
                    email: 'test@example.com',
                    role: 'Student',
                    name: 'Test User'
               };
          });

          it('should allow access for authorized role', () => {
               const middleware = authorizeRoles('Student');
               middleware(req, res, next);

               expect(next).toHaveBeenCalled();
               expect(res.status).not.toHaveBeenCalled();
          });

          it('should allow access for multiple authorized roles', () => {
               const middleware = authorizeRoles(['Student', 'Lecturer']);
               middleware(req, res, next);

               expect(next).toHaveBeenCalled();
               expect(res.status).not.toHaveBeenCalled();
          });

          it('should deny access for unauthorized role', () => {
               const middleware = authorizeRoles('Admin');
               middleware(req, res, next);

               expect(res.status).toHaveBeenCalledWith(403);
               expect(res.json).toHaveBeenCalledWith({
                    error: {
                         code: 'FORBIDDEN',
                         message: 'Access denied. Required role(s): Admin',
                         timestamp: expect.any(String)
                    }
               });
               expect(next).not.toHaveBeenCalled();
          });

          it('should return 401 if user not authenticated', () => {
               req.user = null;
               const middleware = authorizeRoles('Student');
               middleware(req, res, next);

               expect(res.status).toHaveBeenCalledWith(401);
               expect(res.json).toHaveBeenCalledWith({
                    error: {
                         code: 'UNAUTHORIZED',
                         message: 'User authentication required',
                         timestamp: expect.any(String)
                    }
               });
               expect(next).not.toHaveBeenCalled();
          });
     });

     describe('requireAdmin', () => {
          it('should allow access for Admin role', () => {
               req.user = { role: 'Admin' };
               requireAdmin(req, res, next);

               expect(next).toHaveBeenCalled();
               expect(res.status).not.toHaveBeenCalled();
          });

          it('should deny access for non-Admin role', () => {
               req.user = { role: 'Student' };
               requireAdmin(req, res, next);

               expect(res.status).toHaveBeenCalledWith(403);
               expect(next).not.toHaveBeenCalled();
          });
     });

     describe('requireLecturer', () => {
          it('should allow access for Lecturer role', () => {
               req.user = { role: 'Lecturer' };
               requireLecturer(req, res, next);

               expect(next).toHaveBeenCalled();
               expect(res.status).not.toHaveBeenCalled();
          });

          it('should deny access for non-Lecturer role', () => {
               req.user = { role: 'Student' };
               requireLecturer(req, res, next);

               expect(res.status).toHaveBeenCalledWith(403);
               expect(next).not.toHaveBeenCalled();
          });
     });

     describe('requireStudent', () => {
          it('should allow access for Student role', () => {
               req.user = { role: 'Student' };
               requireStudent(req, res, next);

               expect(next).toHaveBeenCalled();
               expect(res.status).not.toHaveBeenCalled();
          });

          it('should deny access for non-Student role', () => {
               req.user = { role: 'Admin' };
               requireStudent(req, res, next);

               expect(res.status).toHaveBeenCalledWith(403);
               expect(next).not.toHaveBeenCalled();
          });
     });

     describe('requireOwnershipOrAdmin', () => {
          it('should allow Admin to access any resource', () => {
               req.user = { id: 'admin123', role: 'Admin' };
               req.params.userId = 'other-user';

               const middleware = requireOwnershipOrAdmin();
               middleware(req, res, next);

               expect(next).toHaveBeenCalled();
               expect(res.status).not.toHaveBeenCalled();
          });

          it('should allow user to access their own resource', () => {
               req.user = { id: 'user123', role: 'Student' };
               req.params.userId = 'user123';

               const middleware = requireOwnershipOrAdmin();
               middleware(req, res, next);

               expect(next).toHaveBeenCalled();
               expect(res.status).not.toHaveBeenCalled();
          });

          it('should deny user access to other users resources', () => {
               req.user = { id: 'user123', role: 'Student' };
               req.params.userId = 'other-user';

               const middleware = requireOwnershipOrAdmin();
               middleware(req, res, next);

               expect(res.status).toHaveBeenCalledWith(403);
               expect(res.json).toHaveBeenCalledWith({
                    error: {
                         code: 'FORBIDDEN',
                         message: 'Access denied. You can only access your own resources',
                         timestamp: expect.any(String)
                    }
               });
               expect(next).not.toHaveBeenCalled();
          });

          it('should work with custom userIdField', () => {
               req.user = { id: 'user123', role: 'Student' };
               req.body.studentId = 'user123';

               const middleware = requireOwnershipOrAdmin('studentId');
               middleware(req, res, next);

               expect(next).toHaveBeenCalled();
               expect(res.status).not.toHaveBeenCalled();
          });
     });
});