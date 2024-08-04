import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const changesCollectionName = process.env.CHANGE_COLLECTION_NAME;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const cleanOldChanges = async () => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const changesCollection = db.collection(changesCollectionName);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // One week ago

    const result = await changesCollection.deleteMany({ timestamp: { $lt: oneWeekAgo } });
    console.log(`Deleted ${result.deletedCount} old changes`);
  } catch (error) {
    console.error('Error cleaning old changes:', error);
  }
};

// Schedule the task to run every Sunday at midnight
cron.schedule('0 0 * * 0', () => {
  console.log('Running scheduled task to clean old changes...');
  cleanOldChanges();
});

cleanOldChanges().catch(console.error); // Run immediately on start
