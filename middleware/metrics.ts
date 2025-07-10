import { Request, Response, NextFunction } from 'express';
import { metrics, register } from '../lib/monitoring/metrics';
import { errorLogger, auditLogger } from '../lib/logging/logger';

// Middleware to expose Prometheus metrics endpoint
export const metricsEndpoint = async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
};

// Middleware to track authentication attempts
export const trackAuth = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Capture the original end function
    const originalEnd = res.end;

    // Override the end function
    res.end = function (chunk?: any, encoding?: any, callback?: any) {
      // Restore the original end function
      res.end = originalEnd;

      // Track authentication result
      const success = res.statusCode >= 200 && res.statusCode < 300;
      metrics.trackAuth(success);
      
      // Log authentication event
      auditLogger.authEvent(
        req.body?.userId || 'anonymous',
        'authentication_attempt',
        success,
        {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode
        }
      );

      // Track latency
      metrics.trackAuthLatency('authentication', Date.now() - startTime);

      // Call the original end function
      return originalEnd.call(this, chunk, encoding, callback);
    };

    next();
  };
};

// Middleware to track token usage
export const trackToken = () => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization;
    if (token) {
      metrics.trackTokenUsage('access');
      auditLogger.tokenUsage('access_token', 'used', {
        path: req.path,
        method: req.method
      });
    }
    next();
  };
};

// Error handling middleware with metrics
export const errorHandler = () => {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Track error in metrics
    metrics.trackError(error.name);

    // Log error with context
    errorLogger.logError(error, {
      path: req.path,
      method: req.method,
      userId: req.body?.userId || 'anonymous'
    });

    // Send error response
    res.status(500).json({
      error: {
        message: error.message,
        type: error.name
      }
    });
  };
};
