import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const port = process.env.PORT || 9090;
const changesCollectionName = process.env.CHANGE_COLLECTION_NAME;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const app = express();
app.use(express.json());

app.post('/sync', async (req, res) => {
  const { changes } = req.body;
  try {
    await client.connect();
    const db = client.db(dbName);
    const changesCollection = db.collection(changesCollectionName);
    
    for (const change of changes) {
      const { serverId, ...changeData } = change;
      const collection = db.collection(change.ns.coll);
      
      if (change.operationType === 'insert') {
        await collection.insertOne(change.fullDocument);
      } else if (change.operationType === 'update') {
        await collection.updateOne(
          { _id: change.documentKey._id },
          { $set: change.updateDescription.updatedFields }
        );
      } else if (change.operationType === 'delete') {
        await collection.deleteOne({ _id: change.documentKey._id });
      }
      
      await changesCollection.insertOne({ ...changeData, timestamp: new Date(), serverId });
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error syncing changes:', error);
    res.status(500).send('Error syncing changes');
  }
});

app.get('/pull', async (req, res) => {
  const lastPullTime = new Date(req.query.lastPullTime);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    const changesCollection = db.collection(changesCollectionName);
    
    const changes = await changesCollection.find({ timestamp: { $gt: lastPullTime } }).toArray();
    
    res.json(changes);
  } catch (error) {
    console.error('Error fetching changes:', error);
    res.status(500).send('Error fetching changes');
  }
});

app.listen(port, async () => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    console.log(`Online server listening on port ${port}`);
  } catch (err) {
    console.error('Error:', err);
  }
});
