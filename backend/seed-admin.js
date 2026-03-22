const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
     try {
          // Connect to database
          await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/examguard', {
               useNewUrlParser: true,
               useUnifiedTopology: true,
          });
          console.log('Connected to MongoDB');

          // Check if admin already exists
          const existingAdmin = await User.findOne({ role: 'Admin' });
          if (existingAdmin) {
               console.log('Admin user already exists:', existingAdmin.email);
               process.exit(0);
          }

          // Create admin user
          const adminUser = new User({
               name: 'System Administrator',
               email: 'admin@examguard.com',
               password: 'Admin123!',
               role: 'Admin'
          });

          await adminUser.save();
          console.log('✅ Admin user created successfully!');
          console.log('Email: admin@examguard.com');
          console.log('Password: Admin123!');

          // Create a test lecturer
          const lecturerUser = new User({
               name: 'Test Lecturer',
               email: 'lecturer@examguard.com',
               password: 'Lecturer123!',
               role: 'Lecturer'
          });

          await lecturerUser.save();
          console.log('✅ Test lecturer created successfully!');
          console.log('Email: lecturer@examguard.com');
          console.log('Password: Lecturer123!');

          // Create a test student
          const studentUser = new User({
               name: 'Test Student',
               email: 'student@examguard.com',
               password: 'Student123!',
               role: 'Student'
          });

          await studentUser.save();
          console.log('✅ Test student created successfully!');
          console.log('Email: student@examguard.com');
          console.log('Password: Student123!');

          process.exit(0);
     } catch (error) {
          console.error('Error seeding admin user:', error);
          process.exit(1);
     }
};

seedAdmin();