import axios from "axios";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

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

export const pullChanges = async () => {
  try {
    await client.connect();
    const db = client.db(dbName);

    // Ensure the changes collection exists
    await ensureChangesCollection(db);

    const changesCollection = db.collection(changesCollectionName);

    const response = await axios.get(`${onlineServerUrl}/pull`);
    const changes = response.data.changes;

    for (const change of changes) {
      const uniqueId = `${change.operationType}-${change.ns.coll}-${change.documentKey._id}-${change.timestamp}`;

      const existingChange = await changesCollection.findOne({ uniqueId });

      if (!existingChange) {
        await changesCollection.insertOne({ ...change, uniqueId });
        // Apply the change to the local database
        const collection = db.collection(change.ns.coll);
        switch (change.operationType) {
          case "insert":
            await collection.insertOne(change.fullDocument);
            break;
          case "update":
            await collection.updateOne(change.documentKey, {
              $set: change.updateDescription.updatedFields,
            });
            break;
          case "delete":
            await collection.deleteOne(change.documentKey);
            break;
        }
      }
    }
  } catch (error) {
    console.error("Error pulling changes:", error);
  }
};

// // src/pullChanges.js (for both Server A and B)
// import axios from 'axios';
// import { MongoClient } from 'mongodb';
// import dotenv from 'dotenv';

// dotenv.config();

// const uri = process.env.MONGO_URI;
// const dbName = process.env.DB_NAME;
// const onlineServerUrl = process.env.ONLINE_SERVER_URL;
// const pullInterval = 240000; // 4 minutes

// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// export const fetchChanges = async () => {
//   try {
//     const lastPullTime = new Date(Date.now() - pullInterval).toISOString();
//     const response = await axios.get(`${onlineServerUrl}/pull`, { params: { lastPullTime } });

//     const changes = response.data;
//     await client.connect();
//     const db = client.db(dbName);

//     for (const change of changes) {
//       const collection = db.collection(change.ns.coll);

//       if (change.operationType === 'insert') {
//         await collection.insertOne(change.fullDocument);
//       } else if (change.operationType === 'update') {
//         await collection.updateOne(
//           { _id: change.documentKey._id },
//           { $set: change.updateDescription.updatedFields }
//         );
//       } else if (change.operationType === 'delete') {
//         await collection.deleteOne({ _id: change.documentKey._id });
//       }
//     }
//   } catch (error) {
//     console.error('Error pulling changes:', error);
//   }
// };

// setInterval(fetchChanges, pullInterval);
