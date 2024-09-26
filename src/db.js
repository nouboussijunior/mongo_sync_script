// src/db.js

import mongoose from "mongoose";
import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URL || "mongodb://localhost:3001/meteor"; // Replace with your actual MongoDB URI
const dbName = process.env.DB_NAME || "meteor";
const changesCollectionName = process.env.CHANGE_COLLECTION_NAME;

// Set strictQuery to false to prepare for Mongoose 7
mongoose.set("strictQuery", false);

export const connectToDatabase = async () => {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB");

  // Call this function when initializing your database
  createIndexes(db);
};

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

await client.connect();
const db = client.db(dbName);

export const createIndexes = async () => {
  console.log(`Creating INDEXES for collections.......`);
  const collections = await db.listCollections().toArray();

  for (const { name } of collections) {
    if (name !== changesCollectionName) {
      try {
        const collection = db.collection(name);

        // Create indexes on createdAt and updatedAt fields
        await collection.createIndex({ createdAt: 1 });
        await collection.createIndex({ updatedAt: 1 });

        console.log(`Indexes created for collection: ${name}`); 
      } catch (error) {
        console.log(`${error} ${name}`);
      }
    }
  }
};
