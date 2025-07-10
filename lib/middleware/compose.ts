import { NextApiRequest, NextApiResponse } from 'next';

type MiddlewareFunction = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => void | Promise<void>;

type RequestHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

export function composeMiddleware(...middlewares: MiddlewareFunction[]) {
  return function (handler: RequestHandler): RequestHandler {
    return async function (req: NextApiRequest, res: NextApiResponse) {
      // Creates a promise chain of middleware executions
      const chain = middlewares.map(middleware => async (next: () => void | Promise<void>) => {
        await middleware(req, res, next);
      });

      // Execute the chain
      let index = 0;
      const next = async () => {
        if (index < chain.length) {
          await chain[index++](next);
        } else {
          await handler(req, res);
          return undefined;
        }
      };

      try {
        await next();
        return undefined;
      } catch (error) {
        console.error('Middleware chain error:', error);
        res.status(500).json({ error: 'Internal server error' });
                return undefined;
      }
    };
  };
}
