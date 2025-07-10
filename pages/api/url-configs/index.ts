import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { URLConfigCreateInput } from '../../../lib/types/url-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await Database.getInstance();

  switch (req.method) {
    case 'GET':
      const tenantId = req.query.tenantId as string;
      const configs = await db.listURLConfigs(tenantId);
      return res.status(200).json(configs);

    case 'POST':
      const input: URLConfigCreateInput = req.body;
      const newConfig = await db.createURLConfig(input);
      return res.status(201).json(newConfig);

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
