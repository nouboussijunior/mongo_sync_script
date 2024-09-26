// import { MongoClient } from "mongodb";
// import dotenv from "dotenv";

// dotenv.config();

// const uri = process.env.MONGO_URI;
// const dbName = process.env.DB_NAME;
// const serverId = process.env.SERVER_ID;
// const changesCollectionName = process.env.CHANGE_COLLECTION_NAME;

// const client = new MongoClient(uri, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// export const watchChanges = async () => {
//   try {
//     await client.connect();
//     const db = client.db(dbName);
//     const collections = await db.listCollections().toArray();
//     const collectionNames = collections.map((col) => col.name);

//     if (!collectionNames.includes(changesCollectionName)) {
//       await db.createCollection(changesCollectionName);
//       console.log(`Created collection: ${changesCollectionName}`);
//     }

//     collections.forEach(({ name }) => {
//       if (name !== changesCollectionName) {
//         console.log({ name });
//         const collection = db.collection(name);
//         const changeStream = collection.watch([
//           { $match: { "operationType": { $in: ["insert", "update", "delete"] } } }
//         ]);

//         changeStream.on("change", async (change) => {
//           const changeWithServerId = {
//             ...change,
//             uniqueId: `${change.operationType}-${serverId}-${change.ns.coll}-${change.documentKey._id}-${change.timestamp || Date.now()}`,
//             serverId: process.env.SERVER_ID,
//             timestamp: new Date(),
//           };
//           console.log(changeWithServerId);
//           const changesCollection = db.collection(changesCollectionName);
//           if (
//             !changeWithServerId.updateDescription?.updatedFields?.hasOwnProperty(
//               "heartbeat"
//             )
//           ) {
//             await changesCollection.insertOne(changeWithServerId);
//           }
//         });
//       }
//     });
//   } catch (error) {
//     console.error("Error watching changes:", error);
//   }
// };

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const serverId = process.env.SERVER_ID;
const changesCollectionName = process.env.CHANGE_COLLECTION_NAME;
const syncInterval = 10 * 60 * 1000; // 10 minutes in milliseconds

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Ensure the changes collection exists
const ensureChangesCollection = async (db) => {
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((col) => col.name);

  if (!collectionNames.includes(changesCollectionName)) {
    await db.createCollection(changesCollectionName);
    console.log(`Created collection: ${changesCollectionName}`);
  }
};

// Periodic change fetcher
export const watchChanges = async () => {
  console.log(
    "ABOUT TO WATCH CHANGES IN  COLLECTION....................................................-"
  );
  try {
    await client.connect();
    const db = client.db(dbName);

    // Ensure the changes collection exists
    await ensureChangesCollection(db);

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - syncInterval);
    console.log({tenMinutesAgo})
    
    // Loop through each collection (except changes collection) and fetch recent changes
    const collections = await db.listCollections().toArray();
    const changesCollection = db.collection(changesCollectionName);
    
    for (const { name } of collections) {
      if (name !== changesCollectionName) {
        const collection = db.collection(name);
        
        // Fetch documents updated or created in the last 10 minutes
        // const changes = await collection
        //   .find({
        //     $or: [
        //       { createdAt: { $gte: tenMinutesAgo } },
        //       { updatedAt: { $gte: tenMinutesAgo } },
        //       { date: { $gte: tenMinutesAgo } },
        //       { doneAt: { $gte: tenMinutesAgo } },
        //     ],
        //   })
        //   .toArray();
        
        const changes = await collection
        .find({
          $expr: {
            $or: [
              { $gte: [{ $toDate: "$createdAt" }, tenMinutesAgo] },
              { $gte: [{ $toDate: "$updatedAt" }, tenMinutesAgo] },
              { $gte: [{ $toDate: "$date" }, tenMinutesAgo] },
              { $gte: [{ $toDate: "$doneAt" }, tenMinutesAgo] },
            ],
          },
        })
        .toArray();
        // console.log({changes})

        // Log and store the changes to the local changes collection
        for (const change of changes) {
          const uniqueId = `${serverId}-${name}-${change._id}-${now.getTime()}`;

          const changeWithServerId = {
            operationType: change.createdAt ? "insert" : "update",
            documentKey: { _id: change._id },
            ns: { db: dbName, coll: name },
            uniqueId,
            serverId,
            timestamp: now,
            fullDocument: change,
          };

          await changesCollection.insertOne(changeWithServerId);
          console.log(
            `Captured change in collection: ${name}`,
            changeWithServerId
          );
        }
      }
    }
  } catch (error) {
    console.error("Error fetching changes:", error);
  }
};

// Call the fetchChanges function every 10 minutes
// setInterval(fetchChanges, syncInterval);
