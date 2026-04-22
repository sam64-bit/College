import jwt from 'jsonwebtoken';
import { getDb, toObjectId, serializeDoc } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const db = getDb();
    const userObjectId = toObjectId(decoded.userId);

    if (!userObjectId) {
      return res.status(401).json({ error: 'Invalid token or user not approved' });
    }

    const user = await db.collection('users').findOne({
      _id: userObjectId,
      status: 'approved'
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token or user not approved' });
    }

    req.user = serializeDoc(user);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const isAlumni = (req, res, next) => {
  if (req.user.role !== 'alumni') {
    return res.status(403).json({ error: 'Alumni access required' });
  }
  next();
};
