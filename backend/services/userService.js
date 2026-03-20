const User = require('../models/User');
const authService = require('./authService');

class UserService {
     /**
      * Create a new user with specified role
      * @param {Object} userData - User data (name, email, password, role)
      * @returns {Object} Created user data
      */
     async createUser(userData) {
          try {
               const { name, email, password, role } = userData;

               // Check if user already exists
               const existingUser = await User.findByEmail(email);
               if (existingUser) {
                    throw new Error('User with this email already exists');
               }

               // Validate role
               const validRoles = ['Admin', 'Lecturer', 'Student'];
               if (!validRoles.includes(role)) {
                    throw new Error('Invalid role specified');
               }

               // Create new user
               const user = new User({
                    name,
                    email,
                    password,
                    role
               });

               await user.save();

               return {
                    success: true,
                    user: user.toJSON()
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Get all users with optional role filtering
      * @param {string} role - Optional role filter
      * @returns {Object} List of users
      */
     async getUsers(role = null) {
          try {
               let query = { isActive: true };

               if (role) {
                    // Validate role
                    const validRoles = ['Admin', 'Lecturer', 'Student'];
                    if (!validRoles.includes(role)) {
                         throw new Error('Invalid role specified');
                    }
                    query.role = role;
               }

               const users = await User.find(query)
                    .select('-password')
                    .sort({ createdAt: -1 });

               return {
                    success: true,
                    users
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Get user by ID
      * @param {string} userId - User ID
      * @returns {Object} User data
      */
     async getUserById(userId) {
          try {
               const user = await User.findById(userId).select('-password');

               if (!user || !user.isActive) {
                    throw new Error('User not found');
               }

               return {
                    success: true,
                    user
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Update user information
      * @param {string} userId - User ID
      * @param {Object} updateData - Data to update
      * @returns {Object} Updated user data
      */
     async updateUser(userId, updateData) {
          try {
               const user = await User.findById(userId);

               if (!user || !user.isActive) {
                    throw new Error('User not found');
               }

               // Fields that can be updated
               const allowedUpdates = ['name', 'email', 'role'];
               const updates = {};

               // Filter and validate updates
               for (const field of allowedUpdates) {
                    if (updateData[field] !== undefined) {
                         updates[field] = updateData[field];
                    }
               }

               // Validate role if being updated
               if (updates.role) {
                    const validRoles = ['Admin', 'Lecturer', 'Student'];
                    if (!validRoles.includes(updates.role)) {
                         throw new Error('Invalid role specified');
                    }
               }

               // Check email uniqueness if being updated
               if (updates.email && updates.email !== user.email) {
                    const existingUser = await User.findByEmail(updates.email);
                    if (existingUser) {
                         throw new Error('User with this email already exists');
                    }
               }

               // Update user
               Object.assign(user, updates);
               await user.save();

               return {
                    success: true,
                    user: user.toJSON()
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Delete user (soft delete by setting isActive to false)
      * @param {string} userId - User ID
      * @returns {Object} Deletion result
      */
     async deleteUser(userId) {
          try {
               const user = await User.findById(userId);

               if (!user || !user.isActive) {
                    throw new Error('User not found');
               }

               // Soft delete by setting isActive to false
               user.isActive = false;
               await user.save();

               return {
                    success: true,
                    message: 'User deleted successfully'
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Get users by role (convenience method)
      * @param {string} role - User role
      * @returns {Object} List of users with specified role
      */
     async getUsersByRole(role) {
          return this.getUsers(role);
     }

     /**
      * Get user statistics
      * @returns {Object} User statistics by role
      */
     async getUserStats() {
          try {
               const stats = await User.aggregate([
                    { $match: { isActive: true } },
                    { $group: { _id: '$role', count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
               ]);

               const result = {
                    total: 0,
                    Admin: 0,
                    Lecturer: 0,
                    Student: 0
               };

               stats.forEach(stat => {
                    result[stat._id] = stat.count;
                    result.total += stat.count;
               });

               return {
                    success: true,
                    stats: result
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }
}

module.exports = new UserService();