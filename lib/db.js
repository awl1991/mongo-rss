const { MongoClient } = require('mongodb');

// Connection URL
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'headlines_db';
const options = {};

// Cache the MongoDB connection between function calls
let cachedClient = null;
let cachedDb = null;

if (!uri) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

if (!dbName) {
  throw new Error(
    'Please define the MONGODB_DB environment variable inside .env.local'
  );
}

async function connectToDatabase() {
  // If the connection is already established, return the cached connection
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // If no connection is established, create a new one
  const client = new MongoClient(uri, options);
  await client.connect();
  const db = client.db(dbName);

  // Create the headlines collection with indexes if it doesn't exist
  const collections = await db.listCollections({ name: 'headlines' }).toArray();
  if (collections.length === 0) {
    await db.createCollection('headlines');
    const headlines = db.collection('headlines');
    // Create indexes for frequently queried columns to improve performance
    await headlines.createIndex({ link: 1 }, { unique: true });
    await headlines.createIndex({ pub_time: 1 });
    await headlines.createIndex({ source: 1 });
  }

  // Cache the client and db connections
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// Helper functions to simplify database operations

async function getHeadlines(limit = 200) {
  const { db } = await connectToDatabase();
  return db
    .collection('headlines')
    .find({})
    .sort({ pub_time: -1 })
    .limit(limit)
    .toArray();
}

async function insertHeadline(headline) {
  const { db } = await connectToDatabase();
  try {
    return await db.collection('headlines').insertOne(headline);
  } catch (error) {
    // Handle duplicate key error (if the headline already exists)
    if (error.code === 11000) {
      return await updateHeadline(headline);
    }
    throw error;
  }
}

async function updateHeadline(headline) {
  const { db } = await connectToDatabase();
  return db.collection('headlines').updateOne(
    { link: headline.link },
    { 
      $set: {
        headline: headline.headline, 
        pub_time: headline.pub_time, 
        fetch_time: headline.fetch_time 
      } 
    }
  );
}

async function getHeadlineByLink(link) {
  const { db } = await connectToDatabase();
  return db.collection('headlines').findOne({ link });
}

async function deleteOldHeadlines(olderThan) {
  const { db } = await connectToDatabase();
  return db.collection('headlines').deleteMany({
    pub_time: { $lt: olderThan }
  });
}

async function deleteAllHeadlines() {
  const { db } = await connectToDatabase();
  return db.collection('headlines').deleteMany({});
}

async function getHeadlinesCount() {
  const { db } = await connectToDatabase();
  return db.collection('headlines').countDocuments();
}

// Export all functions using CommonJS syntax
module.exports = {
  connectToDatabase,
  getHeadlines,
  insertHeadline,
  updateHeadline,
  getHeadlineByLink,
  deleteOldHeadlines,
  deleteAllHeadlines,
  getHeadlinesCount
};