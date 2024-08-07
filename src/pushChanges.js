import axios from "axios";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import cron from "node-cron";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const onlineServerUrl = process.env.ONLINE_SERVER_URL;
const changesCollectionName = process.env.CHANGE_COLLECTION_NAME;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const ensureChangesCollection = async (db) => {
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((col) => col.name);

  if (!collectionNames.includes(changesCollectionName)) {
    await db.createCollection(changesCollectionName);
    console.log(`Created collection: ${changesCollectionName}`);
  }
};

const pushChanges = async (interval) => {
  try {
    await client.connect();
    const db = client.db(dbName);

    // Ensure the changes collection exists
    await ensureChangesCollection(db);

    const changesCollection = db.collection(changesCollectionName);
    const timeRange = new Date(Date.now() - interval);

    const changes = await changesCollection
      .find({ timestamp: { $gte: timeRange } })
      .toArray();

    if (changes.length > 0) {
      // const changesWithId = changes.map((change) => ({
      //   ...change,
      //   uniqueId: `${change.operationType}-${change.ns?.coll}-${change.documentKey?._id}-${change.timestamp}`,
      // }));

      console.error("About to push changes");
      console.error({ onlineServerUrl });
      await axios.post(`${onlineServerUrl}/sync`, { changes });
      // await changesCollection.deleteMany({ timestamp: { $gte: timeRange } });
    }
  } catch (error) {
    console.error("Error pushing changes:", error);
  }
};

export const initCronTasks = () => {
  // Push changes every hour
  cron.schedule("0 * * * *", () => {
    console.log("Running hourly pushChanges...");
    pushChanges(60 * 60 * 1000); // 1 hour in milliseconds
  });

  // Push changes once a day
  cron.schedule("0 0 * * *", () => {
    console.log("Running daily pushChanges...");
    pushChanges(24 * 60 * 60 * 1000); // 24 hours in milliseconds
  });
};

export const startPushChanges = () => {
  // Initial call to start the push process
  pushChanges(60 * 60 * 1000); // 1 hour in milliseconds
  pushChanges(24 * 60 * 60 * 1000); // 24 hours in milliseconds
};
