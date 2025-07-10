import { sign, verify } from 'jsonwebtoken';
import { generateKeyPairSync } from 'crypto';
/**
 * Enhanced JWT Service with RS256 key management and rotation support
 */
export class JWTService {
    constructor(keyPath = '/path/to/keys', keyRotationIntervalHours = 24) {
        this.keyPath = keyPath;
        this.previousKeyPair = null;
        this.rotationTimer = null;
        this.keyRotationInterval = keyRotationIntervalHours * 60 * 60 * 1000;
        this.currentKeyPair = this.generateNewKeyPair();
        this.startKeyRotation();
    }
    /**
     * Generates a new RSA key pair for JWT signing
     */
    generateNewKeyPair() {
        const { privateKey, publicKey } = generateKeyPairSync('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        return {
            publicKey,
            privateKey,
            keyId: this.generateKeyId(),
            createdAt: Date.now()
        };
    }
    /**
     * Generates a unique key ID for key identification
     */
    generateKeyId() {
        return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Starts the key rotation schedule
     */
    startKeyRotation() {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
        }
        this.rotationTimer = setInterval(() => {
            this.rotateKeys();
        }, this.keyRotationInterval);
    }
    /**
     * Performs key rotation
     */
    rotateKeys() {
        this.previousKeyPair = this.currentKeyPair;
        this.currentKeyPair = this.generateNewKeyPair();
    }
    /**
     * Signs a payload using the current private key
     */
    async sign(payload, options = {}) {
        if (!this.currentKeyPair.privateKey)
            throw new Error('Missing private key');
        const signOptions = Object.assign(Object.assign({}, options), { algorithm: 'RS256', keyid: this.currentKeyPair.keyId, expiresIn: options.expiresIn || '1h' });
        return new Promise((resolve, reject) => {
            sign(payload, this.currentKeyPair.privateKey, signOptions, (err, token) => {
                if (err)
                    return reject(err);
                if (!token)
                    return reject(new Error('Token generation failed'));
                resolve(token);
            });
        });
    }
    /**
     * Verifies a token using current and previous public keys
     */
    async verify(token) {
        if (!this.currentKeyPair.publicKey)
            throw new Error('Missing public key');
        try {
            // Try current key first
            return new Promise((resolve, reject) => {
                verify(token, this.currentKeyPair.publicKey, { algorithms: ['RS256'] }, (err, decoded) => {
                    if (err)
                        return reject(err);
                    if (!decoded || typeof decoded !== 'object')
                        return reject(new Error('Invalid token'));
                    resolve(decoded);
                });
            });
        }
        catch (error) {
            // If current key fails and we have a previous key, try that
            if (this.previousKeyPair) {
                try {
                    const previousPublicKey = this.previousKeyPair.publicKey;
                    if (!previousPublicKey) {
                        throw new Error('No previous key available');
                    }
                    return new Promise((resolve, reject) => {
                        verify(token, previousPublicKey, { algorithms: ['RS256'] }, (err, decoded) => {
                            if (err)
                                return reject(err);
                            if (!decoded || typeof decoded !== 'object')
                                return reject(new Error('Invalid token'));
                            resolve(decoded);
                        });
                    });
                }
                catch (prevError) {
                    throw new Error('Invalid token');
                }
            }
            throw error;
        }
    }
    /**
     * Gets the current public key
     */
    getCurrentPublicKey() {
        return this.currentKeyPair.publicKey;
    }
    /**
     * Gets the key ID of the current key pair
     */
    getCurrentKeyId() {
        return this.currentKeyPair.keyId;
    }
}
//# sourceMappingURL=jwt.service.js.map