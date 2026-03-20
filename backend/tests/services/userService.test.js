const mongoose = require('mongoose');
const userService = require('../../services/userService');
const User = require('../../models/User');

describe('UserService', () => {
     beforeEach(async () => {
          await User.deleteMany({});
     });

     describe('createUser', () => {
          test('should create a new user with valid data', async () => {
               const userData = {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'Password123',
                    role: 'Student'
               };

               const result = await userService.createUser(userData);

               expect(result.success).toBe(true);
               expect(result.user).toBeDefined();
               expect(result.user.name).toBe(userData.name);
               expect(result.user.email).toBe(userData.email);
               expect(result.user.role).toBe(userData.role);
               expect(result.user.password).toBeUndefined(); // Password should not be returned
          });

          test('should fail to create user with duplicate email', async () => {
               const userData = {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'Password123',
                    role: 'Student'
               };

               // Create first user
               await userService.createUser(userData);

               // Try to create second user with same email
               const result = await userService.createUser({
                    ...userData,
                    name: 'Jane Doe'
               });

               expect(result.success).toBe(false);
               expect(result.error).toContain('already exists');
          });

          test('should fail to create user with invalid role', async () => {
               const userData = {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'Password123',
                    role: 'InvalidRole'
               };

               const result = await userService.createUser(userData);

               expect(result.success).toBe(false);
               expect(result.error).toContain('Invalid role');
          });
     });

     describe('getUsers', () => {
          beforeEach(async () => {
               // Create test users
               await User.create([
                    { name: 'Admin User', email: 'admin@example.com', password: 'Password123', role: 'Admin' },
                    { name: 'Lecturer User', email: 'lecturer@example.com', password: 'Password123', role: 'Lecturer' },
                    { name: 'Student User One', email: 'student1@example.com', password: 'Password123', role: 'Student' },
                    { name: 'Student User Two', email: 'student2@example.com', password: 'Password123', role: 'Student' },
                    { name: 'Inactive User', email: 'inactive@example.com', password: 'Password123', role: 'Student', isActive: false }
               ]);
          });

          test('should get all active users when no role filter is provided', async () => {
               const result = await userService.getUsers();

               expect(result.success).toBe(true);
               expect(result.users).toHaveLength(4); // Should not include inactive user
               expect(result.users.every(user => user.isActive)).toBe(true);
          });

          test('should filter users by role', async () => {
               const result = await userService.getUsers('Student');

               expect(result.success).toBe(true);
               expect(result.users).toHaveLength(2);
               expect(result.users.every(user => user.role === 'Student')).toBe(true);
          });

          test('should fail with invalid role filter', async () => {
               const result = await userService.getUsers('InvalidRole');

               expect(result.success).toBe(false);
               expect(result.error).toContain('Invalid role');
          });
     });

     describe('getUserById', () => {
          let testUser;

          beforeEach(async () => {
               testUser = await User.create({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'Password123',
                    role: 'Student'
               });
          });

          test('should get user by valid ID', async () => {
               const result = await userService.getUserById(testUser._id.toString());

               expect(result.success).toBe(true);
               expect(result.user).toBeDefined();
               expect(result.user.name).toBe(testUser.name);
               expect(result.user.password).toBeUndefined(); // Password should not be returned
          });

          test('should fail to get user with invalid ID', async () => {
               const invalidId = new mongoose.Types.ObjectId();
               const result = await userService.getUserById(invalidId.toString());

               expect(result.success).toBe(false);
               expect(result.error).toContain('not found');
          });

          test('should fail to get inactive user', async () => {
               testUser.isActive = false;
               await testUser.save();

               const result = await userService.getUserById(testUser._id.toString());

               expect(result.success).toBe(false);
               expect(result.error).toContain('not found');
          });
     });

     describe('updateUser', () => {
          let testUser;

          beforeEach(async () => {
               testUser = await User.create({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'Password123',
                    role: 'Student'
               });
          });

          test('should update user with valid data', async () => {
               const updateData = {
                    name: 'Updated Name',
                    role: 'Lecturer'
               };

               const result = await userService.updateUser(testUser._id.toString(), updateData);

               expect(result.success).toBe(true);
               expect(result.user.name).toBe(updateData.name);
               expect(result.user.role).toBe(updateData.role);
               expect(result.user.email).toBe(testUser.email); // Should remain unchanged
          });

          test('should fail to update user with duplicate email', async () => {
               // Create another user
               await User.create({
                    name: 'Another User',
                    email: 'another@example.com',
                    password: 'Password123',
                    role: 'Student'
               });

               const result = await userService.updateUser(testUser._id.toString(), {
                    email: 'another@example.com'
               });

               expect(result.success).toBe(false);
               expect(result.error).toContain('already exists');
          });

          test('should fail to update user with invalid role', async () => {
               const result = await userService.updateUser(testUser._id.toString(), {
                    role: 'InvalidRole'
               });

               expect(result.success).toBe(false);
               expect(result.error).toContain('Invalid role');
          });
     });

     describe('deleteUser', () => {
          let testUser;

          beforeEach(async () => {
               testUser = await User.create({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'Password123',
                    role: 'Student'
               });
          });

          test('should soft delete user', async () => {
               const result = await userService.deleteUser(testUser._id.toString());

               expect(result.success).toBe(true);
               expect(result.message).toContain('deleted successfully');

               // Verify user is soft deleted
               const deletedUser = await User.findById(testUser._id);
               expect(deletedUser.isActive).toBe(false);
          });

          test('should fail to delete non-existent user', async () => {
               const invalidId = new mongoose.Types.ObjectId();
               const result = await userService.deleteUser(invalidId.toString());

               expect(result.success).toBe(false);
               expect(result.error).toContain('not found');
          });
     });

     describe('getUserStats', () => {
          beforeEach(async () => {
               await User.create([
                    { name: 'Admin One', email: 'admin1@example.com', password: 'Password123', role: 'Admin' },
                    { name: 'Admin Two', email: 'admin2@example.com', password: 'Password123', role: 'Admin' },
                    { name: 'Lecturer One', email: 'lecturer1@example.com', password: 'Password123', role: 'Lecturer' },
                    { name: 'Student One', email: 'student1@example.com', password: 'Password123', role: 'Student' },
                    { name: 'Student Two', email: 'student2@example.com', password: 'Password123', role: 'Student' },
                    { name: 'Student Three', email: 'student3@example.com', password: 'Password123', role: 'Student' },
                    { name: 'Inactive User', email: 'inactive@example.com', password: 'Password123', role: 'Student', isActive: false }
               ]);
          });

          test('should return correct user statistics', async () => {
               const result = await userService.getUserStats();

               expect(result.success).toBe(true);
               expect(result.stats).toEqual({
                    total: 6,
                    Admin: 2,
                    Lecturer: 1,
                    Student: 3
               });
          });
     });
});