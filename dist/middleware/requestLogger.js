import clientPromise from '../mongodb';
export async function requestLogger(req, res, next) {
    const startTime = Date.now();
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    // Create a reference to the original res.end
    const originalEnd = res.end;
    let statusCode = 200;
    let error;
    // Override res.end to capture the status code and log the request
    const newEnd = function (chunk, encoding, callback) {
        const responseTime = Date.now() - startTime;
        statusCode = res.statusCode;
        // Log the request asynchronously
        (async () => {
            var _a;
            try {
                const client = await clientPromise;
                const db = client.db('sso');
                const logsCollection = db.collection('request_logs');
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    method: req.method || 'UNKNOWN',
                    url: req.url || '',
                    ip: clientIp || 'UNKNOWN',
                    userAgent: req.headers['user-agent'] || 'UNKNOWN',
                    tenantId: (_a = req.tenant) === null || _a === void 0 ? void 0 : _a.id,
                    statusCode,
                    responseTime,
                    error: error
                };
                // Asynchronously log to MongoDB
                await logsCollection.insertOne(logEntry);
            }
            catch (err) {
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
        }
        else if (typeof encoding === 'function') {
            return originalEnd.call(res, chunk, 'utf8', encoding);
        }
        else if (typeof encoding === 'string') {
            return originalEnd.call(res, chunk, encoding, callback);
        }
        else {
            return originalEnd.call(res, chunk, 'utf8', callback);
        }
    };
    // Override the end method
    res.end = newEnd;
    // Catch any errors
    try {
        await next();
    }
    catch (err) {
        error = err.message || 'Internal Server Error';
        throw err;
    }
}
//# sourceMappingURL=requestLogger.js.map