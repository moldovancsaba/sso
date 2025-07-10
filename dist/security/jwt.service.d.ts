import { JwtPayload } from 'jsonwebtoken';
/**
 * Enhanced JWT Service with RS256 key management and rotation support
 */
export declare class JWTService {
    private readonly keyPath;
    private currentKeyPair;
    private previousKeyPair;
    private readonly keyRotationInterval;
    private rotationTimer;
    constructor(keyPath?: string, keyRotationIntervalHours?: number);
    /**
     * Generates a new RSA key pair for JWT signing
     */
    private generateNewKeyPair;
    /**
     * Generates a unique key ID for key identification
     */
    private generateKeyId;
    /**
     * Starts the key rotation schedule
     */
    private startKeyRotation;
    /**
     * Performs key rotation
     */
    rotateKeys(): void;
    /**
     * Signs a payload using the current private key
     */
    sign(payload: object, options?: any): Promise<string>;
    /**
     * Verifies a token using current and previous public keys
     */
    verify(token: string): Promise<JwtPayload>;
    /**
     * Gets the current public key
     */
    getCurrentPublicKey(): string;
    /**
     * Gets the key ID of the current key pair
     */
    getCurrentKeyId(): string;
}
//# sourceMappingURL=jwt.service.d.ts.map