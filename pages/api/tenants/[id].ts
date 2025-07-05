import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongodb';
import { TenantConfig } from '../../../lib/types/tenant';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const client = await clientPromise;
  const db = client.db('sso');
  const tenantsCollection = db.collection('tenants');

  switch (req.method) {
    case 'GET':
      try {
        const tenant = await tenantsCollection.findOne({ id });
        if (!tenant) {
          return res.status(404).json({ error: 'Tenant not found' });
        }
        return res.status(200).json(tenant);
      } catch (error) {
        console.error('Error fetching tenant:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    case 'PUT':
      try {
        const updateData = req.body;
        
        // Validate update data
        if (updateData.id && updateData.id !== id) {
          return res.status(400).json({ error: 'Tenant ID cannot be changed' });
        }

        // Prevent modification of creation date and API keys through this endpoint
        delete updateData.createdAt;
        delete updateData.apiKeys;

        const updatedTenant = {
          ...updateData,
          updatedAt: new Date().toISOString()
        };

        const result = await tenantsCollection.findOneAndUpdate(
          { id },
          { $set: updatedTenant },
          { returnDocument: 'after' }
        );

        if (!result.value) {
          return res.status(404).json({ error: 'Tenant not found' });
        }

        return res.status(200).json(result.value);
      } catch (error) {
        console.error('Error updating tenant:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    case 'DELETE':
      try {
        const result = await tenantsCollection.deleteOne({ id });
        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Tenant not found' });
        }
        return res.status(204).end();
      } catch (error) {
        console.error('Error deleting tenant:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
