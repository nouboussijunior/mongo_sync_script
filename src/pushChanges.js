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

// const pushChanges = async (interval) => {
//   try {
//     await client.connect();
//     const db = client.db(dbName);

//     // Ensure the changes collection exists
//     await ensureChangesCollection(db);

//     const changesCollection = db.collection(changesCollectionName);
//     const timeRange = new Date(Date.now() - interval);

//     const changes = await changesCollection
//       .find({ timestamp: { $gte: timeRange } })
//       .toArray();

//     if (changes.length > 0) {
//       // const changesWithId = changes.map((change) => ({
//       //   ...change,
//       //   uniqueId: `${change.operationType}-${change.ns?.coll}-${change.documentKey?._id}-${change.timestamp}`,
//       // }));

//       console.error("About to push changes");
//       console.error({ onlineServerUrl });
//       // await axios.post(`${onlineServerUrl}/sync`, { changes });
//       // await changesCollection.deleteMany({ timestamp: { $gte: timeRange } });
//     }
//   } catch (error) {
//     console.error("Error pushing changes:", error);
//   }
// };

const syncInterval = 10 * 60 * 1000; // 10 minutes in milliseconds


// Push local changes to remote server
export const pushChanges = async () => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const changesCollection = db.collection(changesCollectionName);

    // Fetch unsynced changes
    const unsyncedChanges = await changesCollection.find().toArray();

    if (unsyncedChanges.length > 0) {
      // Push to remote server
      await axios.post(`${onlineServerUrl}/sync`, { changes: unsyncedChanges });

      // After successfully pushing changes, remove them locally
      // await changesCollection.deleteMany({});
      console.log("Changes successfully pushed to remote server");
    }
  } catch (error) {
    console.error("Error pushing changes:", error);
  }
};

// Pull changes from remote server to sync locally
// export const pullChanges = async () => {
//   try {
//     await client.connect();
//     const db = client.db(dbName);

//     // Pull changes from the remote server
//     const response = await axios.get(`${onlineServerUrl}/pull`);
//     const remoteChanges = response.data.changes;

//     for (const change of remoteChanges) {
//       const collection = db.collection(change.ns.coll);

//       // Apply the change locally
//       switch (change.operationType) {
//         case 'insert':
//           await collection.insertOne(change.fullDocument);
//           break;
//         case 'update':
//           await collection.updateOne(
//             { _id: change.documentKey._id },
//             { $set: change.fullDocument }
//           );
//           break;
//         case 'delete':
//           await collection.deleteOne({ _id: change.documentKey._id });
//           break;
//       }
//     }

//     console.log('Pulled changes from remote server');
//   } catch (error) {
//     console.error("Error pulling changes:", error);
//   }
// };

// Periodically push and pull changes
// setInterval(pushChanges, syncInterval);
// setInterval(pullChanges, syncInterval);


export const initCronTasks = () => {
  // Schedule the cron job to run every 3 minutes
  cron.schedule("*/3 * * * *", () => {
    console.log("Running every 3 minutes...");
    pushChanges(3 * 60 * 1000); // 3 minutes in milliseconds
  });

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

// export const startPushChanges = () => {
//   // Initial call to start the push process
//   pushChanges(60 * 60 * 1000); // 1 hour in milliseconds
//   pushChanges(24 * 60 * 60 * 1000); // 24 hours in milliseconds
// };
