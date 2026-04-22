import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';

dotenv.config();

async function seedAdmin() {
  try {
    const db = await connectDB();
    console.log('Checking for existing admin...');

    const existingAdmin = await db.collection('users').findOne({ email: 'admin@campus.edu' });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    console.log('Creating admin user...');
    const password_hash = await bcrypt.hash('admin123', 10);
    const now = new Date().toISOString();

    await db.collection('users').insertOne({
      email: 'admin@campus.edu',
      password_hash,
      name: 'System Administrator',
      role: 'admin',
      status: 'approved',
      created_at: now,
      updated_at: now
    });

    console.log('Admin user created successfully!');
    console.log('Email: admin@campus.edu');
    console.log('Password: admin123');
    console.log('\nPlease change the admin password after first login.');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedAdmin();