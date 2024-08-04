// src/pushChanges.js (for both Server A and B)

import axios from "axios";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const onlineServerUrl = process.env.ONLINE_SERVER_URL;
const changesCollectionName = process.env.CHANGE_COLLECTION_NAME;
const pushInterval = parseInt(process.env.PUSH_INTERVAL, 10) || 180000;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

export const pushChanges = async () => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const changesCollection = db.collection(changesCollectionName);

    const changes = await changesCollection
      .find({ timestamp: { $gte: new Date(Date.now() - pushInterval) } })
      .toArray();

    if (changes.length > 0) {
      await axios.post(`${onlineServerUrl}/sync`, { changes });
    //   await changesCollection.deleteMany({
    //     timestamp: { $gte: new Date(Date.now() - pushInterval) },
    //   });
    }
  } catch (error) {
    console.error("Error pushing changes:", error);
  }
};

// setInterval(pushChanges, pushInterval);
