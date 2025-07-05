import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';
import clientPromise from '../mongodb';

interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  tenantId?: string;
  statusCode: number;
  responseTime: number;
  error?: string;
}

export async function requestLogger(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) {
  const startTime = Date.now();
  const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;

  // Create a reference to the original res.end
  const originalEnd = res.end;
  let statusCode = 200;
  let error: string | undefined;

  // Override res.end to capture the status code and log the request
  res.end = async function (chunk?: any, encoding?: any, callback?: () => void) {
    const responseTime = Date.now() - startTime;
    statusCode = res.statusCode;

    try {
      const client: MongoClient = await clientPromise;
      const db = client.db('sso');
      const logsCollection = db.collection('request_logs');

      const logEntry: RequestLog = {
        timestamp: new Date().toISOString(),
        method: req.method || 'UNKNOWN',
        url: req.url || '',
        ip: clientIp || 'UNKNOWN',
        userAgent: req.headers['user-agent'] || 'UNKNOWN',
        tenantId: (req as any).tenant?.id,
        statusCode,
        responseTime,
        error: error
      };

      // Asynchronously log to MongoDB
      await logsCollection.insertOne(logEntry);
    } catch (err) {
      console.error('Failed to log request:', err);
    }

    // Call the original end method
    return originalEnd.call(this, chunk, encoding, callback);
  };

  // Catch any errors
  try {
    await next();
  } catch (err: any) {
    error = err.message || 'Internal Server Error';
    throw err;
  }
}
