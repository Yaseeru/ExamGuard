const User = require('../../models/User');

describe('User Model', () => {
     beforeEach(async () => {
          await User.deleteMany({});
     });

     describe('User Creation', () => {
          it('should create a valid user with all required fields', async () => {
               const userData = {
                    name: 'John Doe',
                    email: 'john.doe@example.com',
                    password: 'Password123',
                    role: 'Student'
               };

               const user = new User(userData);
               const savedUser = await user.save();

               expect(savedUser._id).toBeDefined();
               expect(savedUser.name).toBe(userData.name);
               expect(savedUser.email).toBe(userData.email.toLowerCase());
               expect(savedUser.password).not.toBe(userData.password); // Should be hashed
               expect(savedUser.role).toBe(userData.role);
               expect(savedUser.isActive).toBe(true);
               expect(savedUser.createdAt).toBeDefined();
               expect(savedUser.updatedAt).toBeDefined();
          });

          it('should hash password before saving', async () => {
               const userData = {
                    name: 'Jane Smith',
                    email: 'jane.smith@example.com',
                    password: 'SecurePass456',
                    role: 'Lecturer'
               };

               const user = new User(userData);
               await user.save();

               expect(user.password).not.toBe(userData.password);
               expect(user.password.length).toBeGreaterThan(50); // bcrypt hash length
          });

          it('should convert email to lowercase', async () => {
               const userData = {
                    name: 'Test User',
                    email: 'TEST.USER@EXAMPLE.COM',
                    password: 'Password123',
                    role: 'Admin'
               };

               const user = new User(userData);
               await user.save();

               expect(user.email).toBe('test.user@example.com');
          });
     });

     describe('User Validation', () => {
          it('should require name field', async () => {
               const userData = {
                    email: 'test@example.com',
                    password: 'Password123',
                    role: 'Student'
               };

               const user = new User(userData);

               await expect(user.save()).rejects.toThrow('Name is required');
          });

          it('should require email field', async () => {
               const userData = {
                    name: 'Test User',
                    password: 'Password123',
                    role: 'Student'
               };

               const user = new User(userData);

               await expect(user.save()).rejects.toThrow('Email is required');
          });

          it('should validate email format', async () => {
               const userData = {
                    name: 'Test User',
                    email: 'invalid-email',
                    password: 'Password123',
                    role: 'Student'
               };

               const user = new User(userData);

               await expect(user.save()).rejects.toThrow('Please enter a valid email address');
          });

          it('should enforce unique email constraint', async () => {
               const userData1 = {
                    name: 'User One',
                    email: 'duplicate@example.com',
                    password: 'Password123',
                    role: 'Student'
               };

               const userData2 = {
                    name: 'User Two',
                    email: 'duplicate@example.com',
                    password: 'Password456',
                    role: 'Lecturer'
               };

               const user1 = new User(userData1);
               await user1.save();

               const user2 = new User(userData2);
               await expect(user2.save()).rejects.toThrow();
          });

          it('should validate password strength', async () => {
               const weakPasswords = [
                    'weak',           // Too short
                    'password',       // No uppercase or numbers
                    'PASSWORD',       // No lowercase or numbers
                    '12345678',       // No letters
                    'Password'        // No numbers
               ];

               for (const password of weakPasswords) {
                    const userData = {
                         name: 'Test User',
                         email: `test${Math.random()}@example.com`,
                         password,
                         role: 'Student'
                    };

                    const user = new User(userData);
                    await expect(user.save()).rejects.toThrow();
               }
          });

          it('should validate role enum', async () => {
               const userData = {
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'Password123',
                    role: 'InvalidRole'
               };

               const user = new User(userData);

               await expect(user.save()).rejects.toThrow('Role must be either Admin, Lecturer, or Student');
          });

          it('should validate name format', async () => {
               const invalidNames = [
                    'A',              // Too short
                    'User123',        // Contains numbers
                    'User@Name',      // Contains special characters
                    'A'.repeat(51)    // Too long
               ];

               for (const name of invalidNames) {
                    const userData = {
                         name,
                         email: `test${Math.random()}@example.com`,
                         password: 'Password123',
                         role: 'Student'
                    };

                    const user = new User(userData);
                    await expect(user.save()).rejects.toThrow();
               }
          });
     });

     describe('User Methods', () => {
          let user;

          beforeEach(async () => {
               const userData = {
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'Password123',
                    role: 'Student'
               };

               user = new User(userData);
               await user.save();
          });

          it('should compare password correctly', async () => {
               const isMatch = await user.comparePassword('Password123');
               expect(isMatch).toBe(true);

               const isNotMatch = await user.comparePassword('WrongPassword');
               expect(isNotMatch).toBe(false);
          });

          it('should exclude password from JSON output', () => {
               const userJSON = user.toJSON();
               expect(userJSON.password).toBeUndefined();
               expect(userJSON.name).toBe('Test User');
               expect(userJSON.email).toBe('test@example.com');
          });
     });

     describe('User Static Methods', () => {
          beforeEach(async () => {
               const users = [
                    { name: 'Admin User', email: 'admin@example.com', password: 'Password123', role: 'Admin' },
                    { name: 'Lecturer One', email: 'lecturer1@example.com', password: 'Password123', role: 'Lecturer' },
                    { name: 'Lecturer Two', email: 'lecturer2@example.com', password: 'Password123', role: 'Lecturer' },
                    { name: 'Student One', email: 'student1@example.com', password: 'Password123', role: 'Student' },
                    { name: 'Student Two', email: 'student2@example.com', password: 'Password123', role: 'Student' }
               ];

               await User.insertMany(users);
          });

          it('should find user by email', async () => {
               const user = await User.findByEmail('admin@example.com');
               expect(user).toBeTruthy();
               expect(user.role).toBe('Admin');

               const nonExistent = await User.findByEmail('nonexistent@example.com');
               expect(nonExistent).toBeNull();
          });

          it('should find users by role', async () => {
               const lecturers = await User.findByRole('Lecturer');
               expect(lecturers).toHaveLength(2);
               expect(lecturers.every(user => user.role === 'Lecturer')).toBe(true);

               const students = await User.findByRole('Student');
               expect(students).toHaveLength(2);
               expect(students.every(user => user.role === 'Student')).toBe(true);

               const admins = await User.findByRole('Admin');
               expect(admins).toHaveLength(1);
               expect(admins[0].role).toBe('Admin');
          });
     });
});