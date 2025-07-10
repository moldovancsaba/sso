import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { Identity } from '../../../lib/types/identity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await Database.getInstance();

  switch (req.method) {
    case 'GET':
      const id = req.query.id as string;
      const identity = await db.getIdentity(id);
      if (identity) {
        return res.status(200).json(identity);
      } else {
        return res.status(404).json({ error: 'Identity not found' });
      }

    case 'POST':
      const newIdentity: Identity = req.body;
      const createdIdentity = await db.createIdentity(newIdentity);
      return res.status(201).json(createdIdentity);

    case 'PUT':
      const updateId = req.query.id as string;
      const updateData: Partial<Identity> = req.body;
      const updatedIdentity = await db.updateIdentity(updateId, updateData);
      if (updatedIdentity) {
        return res.status(200).json(updatedIdentity);
      } else {
        return res.status(404).json({ error: 'Identity not found' });
      }

    case 'DELETE':
      const deleteId = req.query.id as string;
      const deleted = await db.deleteIdentity(deleteId);
      return res.status(deleted ? 204 : 404).end();

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
