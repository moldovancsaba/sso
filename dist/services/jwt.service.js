import { sign, verify } from 'jsonwebtoken';
// Promisify JWT functions
const signAsync = (payload, secret, options) => {
    return new Promise((resolve, reject) => {
        sign(payload, secret, options || {}, (err, token) => {
            if (err)
                return reject(err);
            if (!token)
                return reject(new Error('Token generation failed'));
            resolve(token);
        });
    });
};
const verifyAsync = (token, secret, options) => {
    return new Promise((resolve, reject) => {
        verify(token, secret, options || {}, (err, decoded) => {
            if (err)
                return reject(err);
            if (!decoded || typeof decoded !== 'object')
                return reject(new Error('Invalid token payload'));
            resolve(decoded);
        });
    });
};
export class JWTService {
    /**
     * Signs a JWT token with the given payload and secret
     * @param payload - The data to be included in the token
     * @param secret - The secret key used to sign the token
     * @param options - Optional signing configuration
     * @returns A Promise that resolves to the signed JWT string
     */
    async signToken(payload, secret, options) {
        return signAsync(payload, secret, options || {});
    }
    /**
     * Verifies and decodes a JWT token
     * @param token - The JWT string to verify
     * @param secret - The secret key used to verify the token
     * @param options - Optional verification configuration
     * @returns A Promise that resolves to the decoded token payload
     */
    async verifyToken(token, secret, options) {
        return verifyAsync(token, secret, options || {});
    }
}
//# sourceMappingURL=jwt.service.js.map