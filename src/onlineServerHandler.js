// import express from "express";
// import { MongoClient } from "mongodb";
// import dotenv from "dotenv";

// dotenv.config();

// const uri = process.env.MONGO_URI;
// const dbName = process.env.DB_NAME;
// const port = process.env.APP_PORT;
// const changesCollectionName = process.env.CHANGE_COLLECTION_NAME;

// const client = new MongoClient(uri, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// const app = express();
// app.use(express.json());

// app.post("/sync", async (req, res) => {
//   console.log("Pushed Sync");
//   const { changes } = req.body;
//   try {
//     await client.connect();
//     const db = client.db(dbName);
//     const changesCollection = db.collection(changesCollectionName);

//     for (const change of changes) {
//       try {
//         const { serverId, ...changeData } = change;
//         const collection = db.collection(change.ns.coll);
        
//         const existingChange = await changesCollection.findOne({
//           uniqueId: change.uniqueId,
//         });

//         if (!existingChange) {
//           if (change.operationType === "insert") {
//             await collection.insertOne(change.fullDocument);
//           } else if (change.operationType === " q qdate") {
//             await collection.updateOne(
//               { _id: change.documentKey._id },
//               { $set: change.updateDescription.updatedFields }
//             );
//           } else if (change.operationType === "delete") {
//             await collection.deleteOne({ _id: change.documentKey._id });
//           }

//           await changesCollection.insertOne({
//             ...changeData,
//             timestamp: new Date(),
//             serverId,
//           });
//         }
//       } catch (error) {
//         console.error(
//           "Error inside Loop on ONLINE SERVER, only onle change concerned, the loop continues:",
//           error
//         );
//       }
//     }
//     res.sendStatus(200);
//   } catch (error) {
//     console.error("Error syncing changes:", error);
//     res.status(500).send("Error syncing changes");
//   }
// });

// app.get("/pull", async (req, res) => {
//   console.log("Pulled Sync");
//   const lastPullTime = new Date(req.query.lastPullTime);

//   try {
//     await client.connect();
//     const db = client.db(dbName);
//     const changesCollection = db.collection(changesCollectionName);

//     const changes = await changesCollection
//       .find({ timestamp: { $gt: lastPullTime } })
//       .toArray();

//     res.json(changes);
//   } catch (error) {
//     console.error("Error fetching changes:", error);
//     res.status(500).send("Error fetching changes");
//   }
// });


import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const changesCollectionName = process.env.CHANGE_COLLECTION_NAME;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

client.connect().then(() => {
  console.log("Connected to MongoDB");
});

// Apply incoming changes from local server
app.post("/sync", async (req, res) => {
  try {
    const db = client.db(dbName);
    const changes = req.body.changes;
    
    if (!changes || !changes.length) {
      return res.status(400).json({ message: "No changes provided" });
    }
    
    for (const change of changes) {
      const collection = db.collection(change.ns.coll);
      
      // switch (change.operationType) {
        //   case "insert":
        //     await collection.insertOne(change.fullDocument);
        //     break;
        //   case "update":
        await collection.update(
          { _id: change.documentKey._id },
          { $set: change.fullDocument },
          { upsert: true }
        );
        //     break;
        //   case "delete":
        //     await collection.deleteOne({ _id: change.documentKey._id });
        //     break;
        // }
      }
      
      res.status(200).json({ message: "Changes applied successfully" });
    } catch (error) {
      console.error("Error applying changes:", error);
      res.status(500).json({ message: "Error applying changes" });
    }
  });

  // Provide changes for the local server to pull
  app.get("/pull", async (req, res) => {
    try {
      const db = client.db(dbName);
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000); // Fetch last 10 minutes' changes
      
      // Fetch recent changes from the changes collection
      const changesCollection = db.collection(changesCollectionName);
      const recentChanges = await changesCollection
      .find({ timestamp: { $gte: tenMinutesAgo } })
      .toArray();
      
      res.status(200).json({ changes: recentChanges });
    } catch (error) {
      console.error("Error fetching changes:", error);
      res.status(500).json({ message: "Error fetching changes" });
    }
  });

  
  export const startServer = async () => {
    try {
    const PORT = process.env.APP_PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Online Server running on port ${PORT}`);
    });
//     await client.connect();
//     console.log("Connected to MongoDB");
//     app.listen(port, () => {
//       console.log(`Online server listening on port ${port}`);
//     });
  } catch (err) {
    console.error("Error:", err);
  }
};