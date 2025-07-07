import { NextApiRequest, NextApiResponse } from 'next';
type MiddlewareFunction = (req: NextApiRequest, res: NextApiResponse, next: () => void) => void | Promise<void>;
type RequestHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
export declare function composeMiddleware(...middlewares: MiddlewareFunction[]): (handler: RequestHandler) => RequestHandler;
export {};
//# sourceMappingURL=compose.d.ts.map