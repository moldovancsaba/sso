import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { URLConfigUpdateInput } from '../../../lib/types/url-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid URL configuration ID' });
  }

  const db = await Database.getInstance();

  switch (req.method) {
    case 'GET':
      const config = await db.getURLConfig(id);
      if (!config) {
        return res.status(404).json({ error: 'URL configuration not found' });
      }
      return res.status(200).json(config);

    case 'PUT':
      const input: URLConfigUpdateInput = req.body;
      const updatedConfig = await db.updateURLConfig(id, input);
      if (!updatedConfig) {
        return res.status(404).json({ error: 'URL configuration not found' });
      }
      return res.status(200).json(updatedConfig);

    case 'DELETE':
      const deleted = await db.deleteURLConfig(id);
      if (!deleted) {
        return res.status(404).json({ error: 'URL configuration not found' });
      }
      return res.status(204).end();

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
