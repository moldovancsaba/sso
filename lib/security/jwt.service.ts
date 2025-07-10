import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { generateKeyPairSync } from 'crypto';

/**
 * Interface for JWT key pair management
 */
interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
  createdAt: number;
}

/**
 * Enhanced JWT Service with RS256 key management and rotation support
 */
export class JWTService {
  private currentKeyPair: KeyPair;
  private previousKeyPair: KeyPair | null = null;
  private readonly keyRotationInterval: number;
  private rotationTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly keyPath: string = '/path/to/keys',
    keyRotationIntervalHours: number = 24
  ) {
    this.keyRotationInterval = keyRotationIntervalHours * 60 * 60 * 1000;
    this.currentKeyPair = this.generateNewKeyPair();
    this.startKeyRotation();
  }

  /**
   * Generates a new RSA key pair for JWT signing
   */
  private generateNewKeyPair(): KeyPair {
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
  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Starts the key rotation schedule
   */
  private startKeyRotation(): void {
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
  public rotateKeys(): void {
    this.previousKeyPair = this.currentKeyPair;
    this.currentKeyPair = this.generateNewKeyPair();
  }

  /**
   * Signs a payload using the current private key
   */
  public async sign(payload: object, options: any = {}): Promise<string> {
    if (!this.currentKeyPair.privateKey) throw new Error('Missing private key');
    const signOptions = {
      ...options,
      algorithm: 'RS256',
      keyid: this.currentKeyPair.keyId,
      expiresIn: options.expiresIn || '1h'
    };

    return new Promise((resolve, reject) => {
      sign(payload, this.currentKeyPair.privateKey, signOptions, (err, token) => {
        if (err) return reject(err);
        if (!token) return reject(new Error('Token generation failed'));
        resolve(token);
      });
    });
  }

  /**
   * Verifies a token using current and previous public keys
   */
  public async verify(token: string): Promise<JwtPayload> {
    if (!this.currentKeyPair.publicKey) throw new Error('Missing public key');
    try {
      // Try current key first
      return new Promise((resolve, reject) => {
        verify(token, this.currentKeyPair.publicKey, { algorithms: ['RS256'] }, (err: Error | null, decoded: any) => {
          if (err) return reject(err);
          if (!decoded || typeof decoded !== 'object') return reject(new Error('Invalid token'));
          resolve(decoded as JwtPayload);
        });
      });
    } catch (error) {
      // If current key fails and we have a previous key, try that
      if (this.previousKeyPair) {
        try {
          const previousPublicKey = this.previousKeyPair.publicKey;
          if (!previousPublicKey) {
            throw new Error('No previous key available');
          }
          return new Promise((resolve, reject) => {
            verify(token, previousPublicKey, { algorithms: ['RS256'] }, (err: Error | null, decoded: any) => {
              if (err) return reject(err);
              if (!decoded || typeof decoded !== 'object') return reject(new Error('Invalid token'));
              resolve(decoded as JwtPayload);
            });
          });
        } catch (prevError) {
          throw new Error('Invalid token');
        }
      }
      throw error;
    }
  }

  /**
   * Gets the current public key
   */
  public getCurrentPublicKey(): string {
    return this.currentKeyPair.publicKey;
  }

  /**
   * Gets the key ID of the current key pair
   */
  public getCurrentKeyId(): string {
    return this.currentKeyPair.keyId;
  }
}
