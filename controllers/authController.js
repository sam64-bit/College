import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb, toObjectId, serializeDoc } from '../config/database.js';

export const register = async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      role,
      branch,
      batch_year,
      skills,
      career_interests,
      dream_companies,
      company,
      job_role,
      career_path,
      open_for_referral,
      open_for_guidance,
      guidance_type
    } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['student', 'alumni'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const db = getDb();

    const existingUser = await db.collection('users').findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const userData = {
      email: email.toLowerCase(),
      password_hash,
      name,
      role,
      status: 'pending',
      created_at: now,
      updated_at: now
    };

    if (role === 'student') {
      userData.branch = branch || null;
      userData.batch_year = batch_year || null;
      userData.skills = Array.isArray(skills) ? skills : [];
      userData.career_interests = career_interests || null;
      userData.dream_companies = dream_companies || null;
      userData.looking_for_guidance = req.body.looking_for_guidance || false;
    } else {
      userData.company = company || null;
      userData.job_role = job_role || null;
      userData.career_path = career_path || null;
      userData.branch = branch || null;
      userData.batch_year = batch_year || null;
      userData.skills = Array.isArray(skills) ? skills : [];
      userData.open_for_referral = open_for_referral || false;
      userData.open_for_guidance = open_for_guidance || false;
      userData.guidance_type = Array.isArray(guidance_type) ? guidance_type : [];
    }

    const result = await db.collection('users').insertOne(userData);

    res.status(201).json({
      message: 'Registration successful. Awaiting admin approval.',
      userId: result.insertedId.toString()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const db = getDb();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Account has been blocked' });
    }

    if (user.status === 'pending' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Account pending approval' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const cleanUser = serializeDoc(user);

    const token = jwt.sign(
      { userId: cleanUser.id, email: cleanUser.email, role: cleanUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete cleanUser.password_hash;

    res.json({
      message: 'Login successful',
      token,
      user: cleanUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userResponse = { ...req.user };
    delete userResponse.password_hash;
    res.json({ user: userResponse });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const db = getDb();
    const userId = toObjectId(req.user.id);

    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const updates = { ...req.body };

    delete updates.id;
    delete updates.email;
    delete updates.password_hash;
    delete updates.role;
    delete updates.status;
    delete updates.created_at;

    if (updates.skills && !Array.isArray(updates.skills)) {
      updates.skills = [];
    }

    if (updates.guidance_type && !Array.isArray(updates.guidance_type)) {
      updates.guidance_type = [];
    }

    updates.updated_at = new Date().toISOString();

    await db.collection('users').updateOne({ _id: userId }, { $set: updates });
    const updated = await db.collection('users').findOne({ _id: userId });

    if (!updated) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    const userResponse = serializeDoc(updated);
    delete userResponse.password_hash;

    res.json({ message: 'Profile updated successfully', user: userResponse });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error during profile update' });
  }
};