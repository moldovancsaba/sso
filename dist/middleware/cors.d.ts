import { NextFunction, Request, Response } from 'express';
/**
 * CORS Configuration interface defining allowed origins and methods
 * Supports both static and dynamic origin validation
 */
export interface CORSConfig {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
    credentials: boolean;
}
/**
 * CORS middleware factory that creates a configured middleware instance
 * Handles both preflight requests and actual CORS headers
 */
export declare const corsMiddleware: (customConfig?: Partial<CORSConfig>) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=cors.d.ts.map