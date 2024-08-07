import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const serverId = process.env.SERVER_ID;
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
    const collectionNames = collections.map((col) => col.name);

    if (!collectionNames.includes(changesCollectionName)) {
      await db.createCollection(changesCollectionName);
      console.log(`Created collection: ${changesCollectionName}`);
    }

    collections.forEach(({ name }) => {
      if (name !== changesCollectionName) {
        console.log({ name });
        const collection = db.collection(name);
        const changeStream = collection.watch();

        changeStream.on("change", async (change) => {
          const changeWithServerId = {
            ...change,
            uniqueId: `${change.operationType}-${serverId}-${change.ns.coll}-${change.documentKey._id}-${change.timestamp || Date.now()}`,
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
      }
    });
  } catch (error) {
    console.error("Error watching changes:", error);
  }
};
