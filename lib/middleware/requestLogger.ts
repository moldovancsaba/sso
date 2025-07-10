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
  const newEnd = function (this: any, chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void) {
    const responseTime = Date.now() - startTime;
    statusCode = res.statusCode;

    // Log the request asynchronously
    (async () => {
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
    })();

    // Handle overloaded function signature
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }

    // Call the original end method
    // Handle different function signatures
    if (!chunk) {
      return originalEnd.call(res, null, 'utf8', callback);
    } else if (typeof encoding === 'function') {
      return originalEnd.call(res, chunk, 'utf8', encoding);
    } else if (typeof encoding === 'string') {
      return originalEnd.call(res, chunk, encoding, callback);
    } else {
      return originalEnd.call(res, chunk, 'utf8', callback);
    }
  };

  // Override the end method
  res.end = newEnd;

  // Catch any errors
  try {
    await next();
  } catch (err: any) {
    error = err.message || 'Internal Server Error';
    throw err;
  }
}
