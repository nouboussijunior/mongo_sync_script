import axios from "axios";
import { MongoClient, ObjectId } from "mongodb";
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

// const pullChanges = async () => {
//   try {
//     await client.connect();
//     const db = client.db(dbName);

//     // Ensure the changes collection exists
//     await ensureChangesCollection(db);

//     const changesCollection = db.collection(changesCollectionName);
//     console.log("About to pull");
//     console.log({ onlineServerUrl });
//     const response = await axios.get(`${onlineServerUrl}/pull`);
//     const changes = response.data;
//     console.log(response.data);
    

//     for (const change of changes) {
//       try {
//         // const uniqueId = `${change.operationType}-${change.ns?.coll}-${change.documentKey?._id}-${change.timestamp}`;

//         // const existingChange = await changesCollection.findOne({ uniqueId });
//         const existingChange = await changesCollection.findOne({
//           uniqueId: change.uniqueId,
//         });

//         if (!existingChange) {
//           await changesCollection.insertOne({ ...change });
//           // Apply the change to the local database
//           const collection = db.collection(change.ns.coll);
//           switch (change.operationType) {
//             case "insert":
//               await collection.insertOne(change.fullDocument);
//               break;
//             case "update":
//               await collection.updateOne(change.documentKey, {
//                 $set: change.updateDescription.updatedFields,
//               });
//               break;
//             case "delete":
//               await collection.deleteOne(change.documentKey);
//               break;
//           }
//         }
//       } catch (error) {
//         console.error(
//           "Error inside Loop, only onle change concerned, the loop continues:",
//           error
//         );
//       }
//     }
//   } catch (error) {
//     console.error("Error pulling changes:", error);
//   }
// };

// export const startPullChanges = () => {
//   // Initial call to start the pull process
//   pullChanges();
// };

export const startPullChanges = async () => {
  try {
    await client.connect();
    const db = client.db(dbName);

    const lastPullTime = new Date(Date.now() - 10 * 60 * 1000); // Adjust this period to your sync frequency
    const response = await axios.get(`${onlineServerUrl}/pull`, {
      params: { lastPullTime: lastPullTime.toISOString() },
    });
    const changes = response.data?.changes;

    for (const change of changes) {
      const collection = db.collection(change.ns.coll);

      await collection.update(
        { _id: change.documentKey._id },
        { $set: change.fullDocument },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error("Error pulling changes:", error);
  }
};
