import { Database } from '../db/database';
// Rate limiting using a simple in-memory store
// In production, this should use Redis or a similar distributed cache
const rateLimitStore = {};
export async function validateTenant(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }
    try {
        const db = await Database.getInstance();
        const tenantDoc = await db.validateApiKey(apiKey);
        if (!tenantDoc) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        // Map MongoDB document to TenantConfig
        const tenant = {
            id: tenantDoc._id ? tenantDoc._id.toString() : '',
            name: tenantDoc.name,
            domain: tenantDoc.domain,
            settings: tenantDoc.settings,
            apiKeys: tenantDoc.apiKeys,
            createdAt: tenantDoc.createdAt,
            updatedAt: tenantDoc.updatedAt
        };
        // Add tenant to request for use in route handlers
        req.tenant = tenant;
        next();
    }
    catch (error) {
        console.error('Tenant validation error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=tenantAuth.js.map