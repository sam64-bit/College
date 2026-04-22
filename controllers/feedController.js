import { getDb, toObjectId, serializeDoc, serializeDocs } from '../config/database.js';

const USER_PROJECTION = { password_hash: 0 };

export const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content required' });
    }

    const db = getDb();
    const post = {
      author_id: req.user.id,
      content,
      likes: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await db.collection('posts').insertOne(post);
    res.status(201).json({ message: 'Post created', post: serializeDoc({ _id: result.insertedId, ...post }) });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const getPosts = async (req, res) => {
  try {
    const db = getDb();
    const posts = await db.collection('posts').find({}).sort({ created_at: -1 }).limit(50).toArray();
    const serializedPosts = serializeDocs(posts);

    const authorIds = serializedPosts.map((p) => toObjectId(p.author_id)).filter(Boolean);
    const authors = await db.collection('users').find({ _id: { $in: authorIds } }, { projection: USER_PROJECTION }).toArray();
    const authorMap = new Map(serializeDocs(authors).map((a) => [a.id, a]));

    const withAuthors = serializedPosts.map((post) => ({
      ...post,
      author: authorMap.get(post.author_id)
        ? {
            id: authorMap.get(post.author_id).id,
            name: authorMap.get(post.author_id).name,
            role: authorMap.get(post.author_id).role,
            branch: authorMap.get(post.author_id).branch,
            company: authorMap.get(post.author_id).company
          }
        : null,
      likes: Array.isArray(post.likes) ? post.likes : []
    }));

    res.json({ posts: withAuthors });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const db = getDb();
    const { postId } = req.params;
    const userId = req.user.id;
    const objectId = toObjectId(postId);

    if (!objectId) return res.status(400).json({ error: 'Invalid post id' });

    const post = await db.collection('posts').findOne({ _id: objectId });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let likes = Array.isArray(post.likes) ? post.likes : [];
    likes = likes.includes(userId) ? likes.filter((id) => id !== userId) : [...likes, userId];

    await db.collection('posts').updateOne(
      { _id: objectId },
      { $set: { likes, updated_at: new Date().toISOString() } }
    );

    const updated = await db.collection('posts').findOne({ _id: objectId });
    res.json({ message: 'Like toggled', post: serializeDoc(updated) });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const db = getDb();
    const objectId = toObjectId(req.params.postId);
    if (!objectId) return res.status(400).json({ error: 'Invalid post id' });

    const post = await db.collection('posts').findOne({ _id: objectId });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.collection('posts').deleteOne({ _id: objectId });
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    const db = getDb();
    const announcements = await db.collection('announcements').find({}).sort({ created_at: -1 }).limit(20).toArray();
    const serialized = serializeDocs(announcements);

    const adminIds = serialized.map((a) => toObjectId(a.admin_id)).filter(Boolean);
    const admins = await db.collection('users').find({ _id: { $in: adminIds } }, { projection: USER_PROJECTION }).toArray();
    const adminMap = new Map(serializeDocs(admins).map((a) => [a.id, a]));

    const withAdmins = serialized.map((a) => ({
      ...a,
      admin: adminMap.get(a.admin_id) ? { name: adminMap.get(a.admin_id).name } : null
    }));

    res.json({ announcements: withAdmins });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

    const db = getDb();
    const announcement = {
      admin_id: req.user.id,
      title,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await db.collection('announcements').insertOne(announcement);
    res.status(201).json({
      message: 'Announcement created',
      announcement: serializeDoc({ _id: result.insertedId, ...announcement })
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};