const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
     name: {
          type: String,
          required: [true, 'Name is required'],
          trim: true,
          minlength: [2, 'Name must be at least 2 characters long'],
          maxlength: [50, 'Name cannot exceed 50 characters'],
          match: [/^[a-zA-Z\s.]+$/, 'Name can only contain letters, spaces, and periods']
     },
     email: {
          type: String,
          required: [true, 'Email is required'],
          unique: true,
          trim: true,
          lowercase: true,
          match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
     },
     password: {
          type: String,
          required: [true, 'Password is required'],
          minlength: [8, 'Password must be at least 8 characters long'],
          validate: {
               validator: function (password) {
                    // Check for at least one uppercase, one lowercase, and one number
                    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
               },
               message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
          }
     },
     role: {
          type: String,
          required: [true, 'Role is required'],
          enum: {
               values: ['Admin', 'Lecturer', 'Student'],
               message: 'Role must be either Admin, Lecturer, or Student'
          }
     },
     isActive: {
          type: Boolean,
          default: true
     }
}, {
     timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Index for faster email lookups
userSchema.index({ email: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
     // Only hash the password if it has been modified (or is new)
     if (!this.isModified('password')) return next();

     try {
          // Hash password with cost of 12
          const saltRounds = 12;
          this.password = await bcrypt.hash(this.password, saltRounds);
          next();
     } catch (error) {
          next(error);
     }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
     return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get user data without password
userSchema.methods.toJSON = function () {
     const userObject = this.toObject();
     delete userObject.password;
     return userObject;
};

// Static method to find user by email
userSchema.statics.findByEmail = function (email) {
     return this.findOne({ email: email.toLowerCase() });
};

// Static method to get users by role
userSchema.statics.findByRole = function (role) {
     return this.find({ role, isActive: true });
};

module.exports = mongoose.model('User', userSchema);