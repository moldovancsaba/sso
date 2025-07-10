export class OAuthError extends Error {
    constructor(error, errorDescription, errorUri) {
        super(errorDescription || error);
        this.error = error;
        this.errorDescription = errorDescription;
        this.errorUri = errorUri;
        this.name = 'OAuthError';
    }
}
export function isValidScope(scope) {
    // Validate scope format (space-separated list of case-sensitive strings)
    return scope.split(' ').every(s => /^[^\s]+$/.test(s));
}
export function validateRedirectUri(allowedUris, redirectUri) {
    try {
        const redirect = new URL(redirectUri);
        return allowedUris.some(allowed => {
            const allowedUrl = new URL(allowed);
            // In development, ignore port differences for localhost
            const isLocalhost = redirect.hostname === 'localhost' || redirect.hostname === '127.0.0.1';
            const hostMatches = isLocalhost
                ? redirect.hostname === allowedUrl.hostname // Only match hostname for localhost
                : redirect.host === allowedUrl.host; // Match full host (including port) for non-localhost
            return (redirect.protocol === allowedUrl.protocol &&
                hostMatches &&
                redirect.pathname.startsWith(allowedUrl.pathname));
        });
    }
    catch (_a) {
        return false;
    }
}
export function generateState() {
    return require('crypto').randomBytes(32).toString('hex');
}
export function verifyPKCE(codeVerifier, storedChallenge, method) {
    if (method === 'S256') {
        const hash = require('crypto')
            .createHash('sha256')
            .update(codeVerifier)
            .digest('base64url');
        return hash === storedChallenge;
    }
    return codeVerifier === storedChallenge;
}
export function generateAuthCode() {
    return require('crypto').randomBytes(32).toString('hex');
}
export function getClientCredentials(req) {
    const authHeader = req.headers.authorization;
    if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Basic ')) {
        const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
        const [clientId, clientSecret] = decoded.split(':');
        return { clientId, clientSecret };
    }
    return {};
}
//# sourceMappingURL=types.js.map