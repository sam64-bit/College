import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'campusconnect';

const client = new MongoClient(mongoUri);
let db;

export const connectDB = async () => {
  if (!db) {
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected to MongoDB database: ${dbName}`);
  }
  return db;
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
};

export const toObjectId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
};

export const serializeDoc = (doc) => {
  if (!doc) return null;
  const convert = (value) => {
    if (value instanceof ObjectId) return value.toString();
    if (Array.isArray(value)) return value.map(convert);
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = convert(v);
      }
      return out;
    }
    return value;
  };

  const converted = convert(doc);
  const { _id, ...rest } = converted;
  return {
    id: _id,
    ...rest
  };
};

export const serializeDocs = (docs = []) => docs.map(serializeDoc);
