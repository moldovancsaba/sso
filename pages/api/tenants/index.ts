import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import clientPromise from '../../../lib/mongodb';
import { TenantConfig } from '../../../lib/types/tenant';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise;
  const db = client.db('sso');
  const tenantsCollection = db.collection('tenants');

  switch (req.method) {
    case 'POST':
      try {
        const { name, domain } = req.body;

        if (!name || !domain) {
          return res.status(400).json({ error: 'Name and domain are required' });
        }

        // Create new tenant with default settings
        const newTenant: TenantConfig = {
          id: randomUUID(),
          name,
          domain,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          settings: {
            allowedRedirectDomains: [domain],
            tokenExpiryMinutes: 10,
            ipWhitelist: [],
            rateLimit: {
              requestsPerMinute: 60,
              burstSize: 10
            }
          },
          apiKeys: [{
            key: `sso_${randomUUID().replace(/-/g, '')}`,
            name: 'Default API Key',
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
          }]
        };

        await tenantsCollection.insertOne(newTenant);
        return res.status(201).json(newTenant);
      } catch (error) {
        console.error('Error creating tenant:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    case 'GET':
      try {
        const tenants = await tenantsCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();
        return res.status(200).json(tenants);
      } catch (error) {
        console.error('Error fetching tenants:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    default:
      res.setHeader('Allow', ['POST', 'GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
