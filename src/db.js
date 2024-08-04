// src/db.js

import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL || 'mongodb://localhost:3001/meteor'; // Replace with your actual MongoDB URI
const dbName = process.env.DB_NAME || 'meteor';

// Set strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);

export const connectToDatabase = async () => {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
};

export const watchChanges = async (callback) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    console.log('Starting Watching All Collections');
    await client.connect();

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    collections.forEach(({ name }) => {
      const collection = db.collection(name);
      const changeStream = collection.watch();

      changeStream.on('change', (change) => {
        console.log(`Change detected in collection ${name}:`, change);
        console.log(change.updateDescription?.updatedFields.hasOwnProperty("heartbeat"));
        console.log(change.updateDescription?.updatedFields);
        if(!change.updateDescription?.updatedFields.hasOwnProperty("heartbeat")){
          callback(change);
        }

      });
    });

    console.log(`Watching changes on ${collections.length} collections`);
  } catch (err) {
    console.error('Error:', err);
  }
};
