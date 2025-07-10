var _a;
// Default CORS configuration
const defaultConfig = {
    allowedOrigins: ((_a = process.env.ALLOWED_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',')) || ['http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400, // 24 hours
    credentials: true,
};
/**
 * Validates if the origin is allowed based on the configuration
 * Supports exact matches and wildcard patterns
 */
const isOriginAllowed = (origin, allowedOrigins) => {
    if (!origin)
        return false;
    return allowedOrigins.some(allowed => {
        if (allowed === '*')
            return true;
        if (allowed.includes('*')) {
            const pattern = new RegExp('^' + allowed.replace('*', '.*') + '$');
            return pattern.test(origin);
        }
        return allowed === origin;
    });
};
/**
 * CORS middleware factory that creates a configured middleware instance
 * Handles both preflight requests and actual CORS headers
 */
export const corsMiddleware = (customConfig) => {
    const config = Object.assign(Object.assign({}, defaultConfig), customConfig);
    return (req, res, next) => {
        const origin = req.get('Origin');
        // Check if the origin is allowed
        if (origin && isOriginAllowed(origin, config.allowedOrigins)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            if (config.credentials) {
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
            // Handle preflight requests
            if (req.method === 'OPTIONS') {
                res.setHeader('Access-Control-Allow-Methods', config.allowedMethods.join(','));
                res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(','));
                res.setHeader('Access-Control-Expose-Headers', config.exposedHeaders.join(','));
                res.setHeader('Access-Control-Max-Age', config.maxAge.toString());
                // End preflight request here
                return res.status(204).end();
            }
        }
        next();
    };
};
//# sourceMappingURL=cors.js.map