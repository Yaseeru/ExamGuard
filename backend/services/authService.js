const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

class AuthService {
     constructor() {
          this.jwtSecret = process.env.JWT_SECRET || 'examguard-secret-key';
          this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
     }

     /**
      * Authenticate user with email and password
      * @param {string} email - User email
      * @param {string} password - User password
      * @returns {Object} Authentication result with token and user data
      */
     async authenticateUser(email, password) {
          try {
               // Find user by email
               const user = await User.findByEmail(email);
               if (!user) {
                    throw new Error('Invalid credentials');
               }

               // Check if user is active
               if (!user.isActive) {
                    throw new Error('Account is deactivated');
               }

               // Verify password
               const isPasswordValid = await user.comparePassword(password);
               if (!isPasswordValid) {
                    throw new Error('Invalid credentials');
               }

               // Generate JWT token
               const token = this.generateToken(user);

               // Return user data without password
               const userData = user.toJSON();

               return {
                    success: true,
                    token,
                    user: userData
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Generate JWT token with user claims
      * @param {Object} user - User object
      * @returns {string} JWT token
      */
     generateToken(user) {
          const payload = {
               id: user._id,
               email: user.email,
               role: user.role,
               name: user.name
          };

          return jwt.sign(payload, this.jwtSecret, {
               expiresIn: this.jwtExpiry,
               issuer: 'examguard-system'
          });
     }

     /**
      * Validate JWT token and extract user data
      * @param {string} token - JWT token
      * @returns {Object} Validation result with user data
      */
     async validateToken(token) {
          try {
               // Verify token
               const decoded = jwt.verify(token, this.jwtSecret);

               // Check if user still exists and is active
               const user = await User.findById(decoded.id);
               if (!user || !user.isActive) {
                    throw new Error('User not found or inactive');
               }

               return {
                    valid: true,
                    user: {
                         id: decoded.id,
                         email: decoded.email,
                         role: decoded.role,
                         name: decoded.name
                    }
               };
          } catch (error) {
               return {
                    valid: false,
                    error: error.message
               };
          }
     }

     /**
      * Hash password using bcrypt
      * @param {string} password - Plain text password
      * @returns {string} Hashed password
      */
     async hashPassword(password) {
          const saltRounds = 12;
          return bcrypt.hash(password, saltRounds);
     }

     /**
      * Compare password with hash
      * @param {string} password - Plain text password
      * @param {string} hash - Hashed password
      * @returns {boolean} Password match result
      */
     async comparePassword(password, hash) {
          return bcrypt.compare(password, hash);
     }

     /**
      * Extract token from Authorization header
      * @param {string} authHeader - Authorization header value
      * @returns {string|null} JWT token or null
      */
     extractTokenFromHeader(authHeader) {
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
               return null;
          }
          return authHeader.substring(7);
     }
}

module.exports = new AuthService();