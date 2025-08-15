import { MongoClient } from 'mongodb';
import { config } from '../../../lib/config.js';

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const client = await MongoClient.connect(config.database.uri);
        const db = client.db(config.database.name);
        const users = await db.collection(config.database.collections.users).find({}).toArray();
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
