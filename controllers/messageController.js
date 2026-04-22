import { getDb, toObjectId, serializeDoc, serializeDocs } from '../config/database.js';

const USER_PROJECTION = { password_hash: 0 };

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, message, guidanceType } = req.body;
    const senderId = req.user.id;
    if (!receiverId || !message) return res.status(400).json({ error: 'Receiver ID and message required' });

    const db = getDb();
    const connection = await db.collection('connection_requests').findOne({
      $or: [
        { sender_id: senderId, receiver_id: receiverId },
        { sender_id: receiverId, receiver_id: senderId }
      ],
      status: 'accepted'
    });
    if (!connection) return res.status(403).json({ error: 'Can only message connected users' });

    const doc = {
      sender_id: senderId,
      receiver_id: receiverId,
      message,
      guidance_type: guidanceType || null,
      read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const result = await db.collection('messages').insertOne(doc);
    res.status(201).json({ message: 'Message sent', data: serializeDoc({ _id: result.insertedId, ...doc }) });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const getConversation = async (req, res) => {
  try {
    const db = getDb();
    const currentUserId = req.user.id;
    const { userId } = req.params;

    const messages = await db.collection('messages').find({
      $or: [
        { sender_id: currentUserId, receiver_id: userId },
        { sender_id: userId, receiver_id: currentUserId }
      ]
    }).sort({ created_at: 1 }).toArray();

    await db.collection('messages').updateMany(
      { receiver_id: currentUserId, sender_id: userId, read: false },
      { $set: { read: true, updated_at: new Date().toISOString() } }
    );

    const serialized = serializeDocs(messages);
    const userIds = [...new Set(serialized.flatMap((m) => [m.sender_id, m.receiver_id]))]
      .map(toObjectId).filter(Boolean);
    const users = await db.collection('users').find({ _id: { $in: userIds } }, { projection: USER_PROJECTION }).toArray();
    const userMap = new Map(serializeDocs(users).map((u) => [u.id, u]));

    res.json({
      messages: serialized.map((m) => ({
        ...m,
        sender: userMap.get(m.sender_id) ? { id: userMap.get(m.sender_id).id, name: userMap.get(m.sender_id).name, role: userMap.get(m.sender_id).role } : null,
        receiver: userMap.get(m.receiver_id) ? { id: userMap.get(m.receiver_id).id, name: userMap.get(m.receiver_id).name, role: userMap.get(m.receiver_id).role } : null
      }))
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
};

export const getConversations = async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const messages = await db.collection('messages').find({ $or: [{ sender_id: userId }, { receiver_id: userId }] }).sort({ created_at: -1 }).toArray();
    const serialized = serializeDocs(messages);

    const otherIds = [...new Set(serialized.map((m) => (m.sender_id === userId ? m.receiver_id : m.sender_id)))];
    const users = await db.collection('users').find({ _id: { $in: otherIds.map(toObjectId).filter(Boolean) } }, { projection: USER_PROJECTION }).toArray();
    const userMap = new Map(serializeDocs(users).map((u) => [u.id, u]));

    const conversationsMap = new Map();
    serialized.forEach((msg) => {
      const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!conversationsMap.has(otherUserId)) {
        const unreadCount = serialized.filter((m) => m.sender_id === otherUserId && m.receiver_id === userId && !m.read).length;
        conversationsMap.set(otherUserId, {
          user: userMap.get(otherUserId) ? { id: userMap.get(otherUserId).id, name: userMap.get(otherUserId).name, role: userMap.get(otherUserId).role } : null,
          lastMessage: msg.message,
          lastMessageTime: msg.created_at,
          unreadCount
        });
      }
    });

    res.json({ conversations: Array.from(conversationsMap.values()) });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const db = getDb();
    const senderId = req.params.senderId;
    const receiverId = req.user.id;
    await db.collection('messages').updateMany(
      { sender_id: senderId, receiver_id: receiverId, read: false },
      { $set: { read: true, updated_at: new Date().toISOString() } }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const db = getDb();
    const unreadCount = await db.collection('messages').countDocuments({ receiver_id: req.user.id, read: false });
    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};