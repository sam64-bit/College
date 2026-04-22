import { getDb, toObjectId, serializeDoc, serializeDocs } from '../config/database.js';

const USER_PROJECTION = {
  password_hash: 0
};

export const getSuggestions = async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const userBranch = req.user.branch;
    const userSkills = Array.isArray(req.user.skills) ? req.user.skills : [];
    const userCareerInterests = req.user.career_interests || '';

    const allUsers = await db.collection('users')
      .find({ _id: { $ne: toObjectId(userId) }, status: 'approved' }, { projection: USER_PROJECTION })
      .toArray();

    const existingConnections = await db.collection('connection_requests').find({
      $or: [{ sender_id: userId }, { receiver_id: userId }],
      status: { $in: ['pending', 'accepted'] }
    }).toArray();

    const connectedUserIds = new Set();
    existingConnections.forEach((conn) => {
      connectedUserIds.add(conn.sender_id);
      connectedUserIds.add(conn.receiver_id);
    });

    const mutualConnectionsData = await db.collection('connection_requests')
      .find({ status: 'accepted' })
      .toArray();

    const userConnections = new Set();
    mutualConnectionsData.forEach((conn) => {
      if (conn.sender_id === userId) userConnections.add(conn.receiver_id);
      if (conn.receiver_id === userId) userConnections.add(conn.sender_id);
    });

    const suggestions = allUsers
      .map(serializeDoc)
      .filter((user) => !connectedUserIds.has(user.id))
      .map((user) => {
        let score = 0;

        if (user.branch && user.branch === userBranch) score += 30;

        const otherSkills = Array.isArray(user.skills) ? user.skills : [];
        const commonSkills = userSkills.filter((skill) =>
          otherSkills.some((s) => String(s).toLowerCase() === String(skill).toLowerCase())
        );
        if (commonSkills.length > 0) score += 25;

        if (user.career_interests && userCareerInterests) {
          const interests1 = String(userCareerInterests).toLowerCase();
          const interests2 = String(user.career_interests).toLowerCase();
          if (interests1.includes(interests2) || interests2.includes(interests1)) score += 25;
        }

        const otherConnections = new Set();
        mutualConnectionsData.forEach((conn) => {
          if (conn.sender_id === user.id) otherConnections.add(conn.receiver_id);
          if (conn.receiver_id === user.id) otherConnections.add(conn.sender_id);
        });
        const mutualCount = [...userConnections].filter((id) => otherConnections.has(id)).length;
        if (mutualCount > 0) score += 20;

        return { ...user, suggestion_score: score, mutual_connections: mutualCount };
      })
      .sort((a, b) => b.suggestion_score - a.suggestion_score)
      .slice(0, 10);

    res.json({ suggestions });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
};

export const sendConnectionRequest = async (req, res) => {
  try {
    const db = getDb();
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (!receiverId) return res.status(400).json({ error: 'Receiver ID required' });
    if (senderId === receiverId) return res.status(400).json({ error: 'Cannot connect with yourself' });

    const existing = await db.collection('connection_requests').findOne({
      $or: [
        { sender_id: senderId, receiver_id: receiverId },
        { sender_id: receiverId, receiver_id: senderId }
      ]
    });

    if (existing) return res.status(400).json({ error: 'Connection request already exists' });

    const doc = {
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await db.collection('connection_requests').insertOne(doc);
    const request = serializeDoc({ _id: result.insertedId, ...doc });

    res.status(201).json({ message: 'Connection request sent', request });
  } catch (error) {
    console.error('Send connection request error:', error);
    res.status(500).json({ error: 'Failed to send connection request' });
  }
};

export const getConnectionRequests = async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const requests = await db.collection('connection_requests')
      .find({ receiver_id: userId, status: 'pending' })
      .toArray();

    const senderIds = requests.map((r) => toObjectId(r.sender_id)).filter(Boolean);
    const receiverIds = requests.map((r) => toObjectId(r.receiver_id)).filter(Boolean);
    const users = await db.collection('users')
      .find({ _id: { $in: [...senderIds, ...receiverIds] } }, { projection: USER_PROJECTION })
      .toArray();

    const userMap = new Map(serializeDocs(users).map((u) => [u.id, u]));
    const enriched = serializeDocs(requests).map((r) => ({
      ...r,
      sender: userMap.get(r.sender_id) || null,
      receiver: userMap.get(r.receiver_id) || null
    }));

    res.json({ requests: enriched });
  } catch (error) {
    console.error('Get connection requests error:', error);
    res.status(500).json({ error: 'Failed to fetch connection requests' });
  }
};

export const respondToRequest = async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { requestId, action } = req.body;

    if (!requestId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const objectId = toObjectId(requestId);
    if (!objectId) return res.status(400).json({ error: 'Invalid request id' });

    const request = await db.collection('connection_requests').findOne({
      _id: objectId,
      receiver_id: userId
    });
    if (!request) return res.status(404).json({ error: 'Connection request not found' });

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    await db.collection('connection_requests').updateOne(
      { _id: objectId },
      { $set: { status: newStatus, updated_at: new Date().toISOString() } }
    );

    res.json({ message: `Connection request ${action}ed` });
  } catch (error) {
    console.error('Respond to request error:', error);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
};

export const getConnections = async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const connections = await db.collection('connection_requests').find({
      $or: [{ sender_id: userId }, { receiver_id: userId }],
      status: 'accepted'
    }).toArray();

    const otherUserIds = connections.map((conn) =>
      conn.sender_id === userId ? conn.receiver_id : conn.sender_id
    );

    const users = await db.collection('users').find(
      { _id: { $in: otherUserIds.map(toObjectId).filter(Boolean) } },
      { projection: USER_PROJECTION }
    ).toArray();
    const userMap = new Map(serializeDocs(users).map((u) => [u.id, u]));

    const list = connections.map((conn) => {
      const otherId = conn.sender_id === userId ? conn.receiver_id : conn.sender_id;
      return {
        ...(userMap.get(otherId) || { id: otherId }),
        connected_at: conn.created_at
      };
    });

    res.json({ connections: list });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const db = getDb();
    const query = String(req.query.query || '').trim();
    if (!query) return res.status(400).json({ error: 'Search query required' });

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await db.collection('users').find(
      {
        status: 'approved',
        _id: { $ne: toObjectId(req.user.id) },
        $or: [{ name: regex }, { email: regex }, { company: regex }]
      },
      { projection: USER_PROJECTION }
    ).toArray();

    res.json({ users: serializeDocs(users) });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};