import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-thanperfect';
const MONGODB_DB = 'session-spa';

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const client = await MongoClient.connect(MONGODB_URI);
        const db = client.db(MONGODB_DB);
        const users = await db.collection('users').find({}).toArray();
        res.status(200).json(users);
      } catch (error) {
        res.status(500).json({ error: 'Error connecting to database' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
