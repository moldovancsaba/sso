import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';
import clientPromise from '../mongodb';
import { TenantConfig } from '../types/tenant';

// Rate limiting using a simple in-memory store
// In production, this should use Redis or a similar distributed cache
const rateLimitStore: { [key: string]: { count: number; resetTime: number } } = {};

export async function validateTenant(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) {
  const apiKey = req.headers['x-api-key'] as string;
  const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const client: MongoClient = await clientPromise;
    const db = client.db('sso');
    const tenantsCollection = db.collection('tenants');

    // Find tenant by API key
    const tenantDoc = await tenantsCollection.findOne({
      'apiKeys.key': apiKey
    });

    if (!tenantDoc) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Map MongoDB document to TenantConfig
    const tenant: TenantConfig = {
      id: tenantDoc._id.toString(),
      name: tenantDoc.name,
      domain: tenantDoc.domain,
      createdAt: tenantDoc.createdAt,
      updatedAt: tenantDoc.updatedAt,
      settings: {
        allowedRedirectDomains: tenantDoc.settings?.allowedRedirectDomains || [],
        tokenExpiryMinutes: tenantDoc.settings?.tokenExpiryMinutes || 60,
        ipWhitelist: tenantDoc.settings?.ipWhitelist || [],
        rateLimit: {
          requestsPerMinute: tenantDoc.settings?.rateLimit?.requestsPerMinute || 100,
          burstSize: tenantDoc.settings?.rateLimit?.burstSize || 10
        }
      },
      apiKeys: tenantDoc.apiKeys || []
    };

    if (!tenant) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Validate IP whitelist
    if (tenant.settings.ipWhitelist.length > 0 && !tenant.settings.ipWhitelist.includes(clientIp)) {
      return res.status(403).json({ error: 'IP not whitelisted' });
    }

    // Check rate limit
    const now = Date.now();
    const rateKey = `${tenant.id}:${now - (now % 60000)}`; // Key for current minute
    
    if (!rateLimitStore[rateKey]) {
      rateLimitStore[rateKey] = { count: 0, resetTime: now + 60000 };
    }

    if (rateLimitStore[rateKey].count >= tenant.settings.rateLimit.requestsPerMinute) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    rateLimitStore[rateKey].count++;

    // Clean up expired rate limit entries
    Object.keys(rateLimitStore).forEach(key => {
      if (rateLimitStore[key].resetTime < now) {
        delete rateLimitStore[key];
      }
    });

    // Add tenant to request for use in route handlers
    (req as any).tenant = tenant;
    
    // Update API key last used timestamp
    await tenantsCollection.updateOne(
      { 'apiKeys.key': apiKey },
      { 
        $set: { 
          'apiKeys.$.lastUsed': new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } 
      }
    );

    next();
  } catch (error) {
    console.error('Tenant validation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
