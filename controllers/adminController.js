import { getDb, toObjectId, serializeDoc, serializeDocs } from '../config/database.js';

export const getPendingUsers = async (req, res) => {
  try {
    const db = getDb();
    const users = await db.collection('users')
      .find({ status: 'pending' }, { projection: { password_hash: 0 } })
      .sort({ created_at: -1 })
      .toArray();

    res.json({ users: serializeDocs(users) });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
};

export const approveUser = async (req, res) => {
  try {
    const db = getDb();
    const userId = toObjectId(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });

    const updated_at = new Date().toISOString();
    const result = await db.collection('users').findOneAndUpdate(
      { _id: userId },
      { $set: { status: 'approved', updated_at } },
      { returnDocument: 'after', projection: { password_hash: 0 } }
    );

    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User approved', user: serializeDoc(result) });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
};

export const rejectUser = async (req, res) => {
  try {
    const db = getDb();
    const userId = toObjectId(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });

    await db.collection('users').deleteOne({ _id: userId });
    res.json({ message: 'User rejected and removed' });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Failed to reject user' });
  }
};

export const blockUser = async (req, res) => {
  try {
    const db = getDb();
    const userId = toObjectId(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });

    const result = await db.collection('users').findOneAndUpdate(
      { _id: userId },
      { $set: { status: 'blocked', updated_at: new Date().toISOString() } },
      { returnDocument: 'after', projection: { password_hash: 0 } }
    );

    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User blocked', user: serializeDoc(result) });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const db = getDb();
    const userId = toObjectId(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });

    const result = await db.collection('users').findOneAndUpdate(
      { _id: userId },
      { $set: { status: 'approved', updated_at: new Date().toISOString() } },
      { returnDocument: 'after', projection: { password_hash: 0 } }
    );

    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User unblocked', user: serializeDoc(result) });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const db = getDb();
    const { role, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    const users = await db.collection('users')
      .find(filter, { projection: { password_hash: 0 } })
      .sort({ created_at: -1 })
      .toArray();

    res.json({ users: serializeDocs(users) });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const convertStudentToAlumni = async (req, res) => {
  try {
    const db = getDb();
    const { batchYear } = req.body;
    if (!batchYear) return res.status(400).json({ error: 'Batch year required' });

    const result = await db.collection('users').updateMany(
      { role: 'student', batch_year: batchYear },
      { $set: { role: 'alumni', updated_at: new Date().toISOString() } }
    );

    const users = await db.collection('users').find(
      { role: 'alumni', batch_year: batchYear },
      { projection: { password_hash: 0 } }
    ).toArray();

    res.json({ message: `Converted ${result.modifiedCount} students to alumni`, users: serializeDocs(users) });
  } catch (error) {
    console.error('Convert students error:', error);
    res.status(500).json({ error: 'Failed to convert students' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const db = getDb();
    const userId = toObjectId(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });

    await db.collection('users').deleteOne({ _id: userId });
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const getStats = async (req, res) => {
  try {
    const db = getDb();
    const [students, alumni, pending, opportunities, connections] = await Promise.all([
      db.collection('users').countDocuments({ role: 'student', status: 'approved' }),
      db.collection('users').countDocuments({ role: 'alumni', status: 'approved' }),
      db.collection('users').countDocuments({ status: 'pending' }),
      db.collection('opportunities').countDocuments({ status: 'active' }),
      db.collection('connection_requests').countDocuments({ status: 'accepted' })
    ]);

    res.json({ stats: { students, alumni, pending, opportunities, connections } });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const exportUsers = async (req, res) => {
  try {
    const db = getDb();
    const filter = { status: 'approved' };
    if (req.query.role) filter.role = req.query.role;

    const users = await db.collection('users').find(filter, {
      projection: { name: 1, email: 1, role: 1, branch: 1, batch_year: 1, company: 1, job_role: 1 }
    }).toArray();

    const serialized = serializeDocs(users);
    const csv = [
      'Name,Email,Role,Branch,Batch Year,Company,Job Role',
      ...serialized.map(u => `${u.name},${u.email},${u.role},${u.branch || ''},${u.batch_year || ''},${u.company || ''},${u.job_role || ''}`)
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
};