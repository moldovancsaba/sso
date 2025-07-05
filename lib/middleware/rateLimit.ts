import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';
import clientPromise from '../mongodb';

interface RateLimitConfig {
  requestsPerMinute: number;
  burstSize: number;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

// Sliding window rate limiter with burst control
export async function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) {
  const tenant = (req as any).tenant;
  const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
  
  if (!tenant) {
    return res.status(500).json({ error: 'Tenant information missing' });
  }

  try {
    const client: MongoClient = await clientPromise;
    const db = client.db('sso');
    const rateLimitCollection = db.collection('rate_limits');

    const now = Date.now();
    const windowStart = now - 60000; // One minute window
    const key = `${tenant.id}:${clientIp}`;

    // Get current rate limit info
    const rateLimitInfo = await rateLimitCollection.findOne({ key });
    
    if (!rateLimitInfo) {
      // First request from this tenant+IP
      await rateLimitCollection.insertOne({
        key,
        count: 1,
        resetTime: now + 60000,
        firstRequestTime: now,
        lastRequestTime: now
      });
    } else {
      // Check if window has expired
      if (now > rateLimitInfo.resetTime) {
        // Start new window
        await rateLimitCollection.updateOne(
          { key },
          {
            $set: {
              count: 1,
              resetTime: now + 60000,
              firstRequestTime: now,
              lastRequestTime: now
            }
          }
        );
      } else {
        // Within current window
        const elapsedTime = now - rateLimitInfo.firstRequestTime;
        const normalizedCount = (rateLimitInfo.count * (60000 - elapsedTime)) / 60000;

        // Check both rate and burst limits
        if (
          normalizedCount >= tenant.settings.rateLimit.requestsPerMinute ||
          rateLimitInfo.count >= tenant.settings.rateLimit.burstSize
        ) {
          const retryAfter = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
          res.setHeader('X-RateLimit-Limit', tenant.settings.rateLimit.requestsPerMinute);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime / 1000));
          res.setHeader('Retry-After', retryAfter);
          return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter
          });
        }

        // Update counter
        await rateLimitCollection.updateOne(
          { key },
          {
            $inc: { count: 1 },
            $set: { lastRequestTime: now }
          }
        );
      }
    }

    // Set rate limit headers
    const remaining = Math.max(
      0,
      tenant.settings.rateLimit.requestsPerMinute - (rateLimitInfo?.count || 1)
    );
    res.setHeader('X-RateLimit-Limit', tenant.settings.rateLimit.requestsPerMinute);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil((rateLimitInfo?.resetTime || (now + 60000)) / 1000));

    // Clean up old rate limit entries periodically (async)
    rateLimitCollection.deleteMany({
      resetTime: { $lt: now }
    }).catch(err => console.error('Failed to cleanup rate limits:', err));

    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
