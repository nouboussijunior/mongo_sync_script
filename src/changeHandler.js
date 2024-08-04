import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const changesCollectionName = process.env.CHANGE_COLLECTION_NAME;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

export const watchChanges = async () => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    if (!collectionNames.includes(changesCollectionName)) {
        await db.createCollection(changesCollectionName);
        console.log(`Created collection: ${changesCollectionName}`);
      }

    collections.forEach(({ name }) => {
      console.log({ name });
      const collection = db.collection(name);
      const changeStream = collection.watch();

      changeStream.on("change", async (change) => {
        const changeWithServerId = {
          ...change,
          serverId: process.env.SERVER_ID,
          timestamp: new Date(),
        };
        console.log(changeWithServerId);
        const changesCollection = db.collection(changesCollectionName);
        if (
          !changeWithServerId.updateDescription?.updatedFields?.hasOwnProperty(
            "heartbeat"
          )
        ) {
          await changesCollection.insertOne(changeWithServerId);
        }
      });
    });
  } catch (error) {
    console.error("Error watching changes:", error);
  }
};

// watchChanges();

// // src/changeHandler.js

// import mongoose from 'mongoose';

// export const handleIncomingChange = async (change) => {
//   try {
//     const collectionName = change.ns.coll;
//     const collection = mongoose.connection.collection(collectionName);

//     if (change.operationType === 'insert') {
//       await collection.insertOne(change.fullDocument);
//     } else if (change.operationType === 'update') {
//       await collection.updateOne(
//         { _id: change.documentKey._id },
//         { $set: change.updateDescription.updatedFields }
//       );
//     } else if (change.operationType === 'delete') {
//       await collection.deleteOne({ _id: change.documentKey._id });
//     }

//     console.log(`Change applied successfully to collection ${collectionName}:`, change);
//   } catch (error) {
//     console.error(`Error applying change to collection ${collectionName}:`, error);
//   }
// };

// src/changeHandler.js (for both Server A and B)
