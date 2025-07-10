import crypto from 'crypto';
import { promisify } from 'util';

const generateKeyPair = promisify(crypto.generateKeyPair);

export interface JWK {
  kty: 'RSA';
  use: 'sig';
  kid: string;
  n: string;
  e: string;
  alg: 'RS256';
}

export class KeyManager {
  private static instance: KeyManager;
  private currentKeyPair: {
    publicKey: crypto.KeyObject;
    privateKey: crypto.KeyObject;
    kid: string;
  } | null = null;

  private constructor() {}

  public static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.currentKeyPair) return;

    const keyPair = await generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    const kid = crypto.createHash('sha256')
      .update(keyPair.publicKey)
      .digest('hex')
      .slice(0, 16);

    this.currentKeyPair = {
      publicKey: crypto.createPublicKey(keyPair.publicKey),
      privateKey: crypto.createPrivateKey(keyPair.privateKey),
      kid
    };
  }

  private getKeyComponents(publicKey: crypto.KeyObject): { n: string; e: string } {
    const jwk = publicKey.export({ format: 'jwk' });
    return {
      n: jwk.n!,
      e: jwk.e!
    };
  }

  async getJWKS(): Promise<{ keys: JWK[] }> {
    if (!this.currentKeyPair) {
      await this.initialize();
    }

    const { publicKey, kid } = this.currentKeyPair!;
    const { n, e } = this.getKeyComponents(publicKey);

    const jwk: JWK = {
      kty: 'RSA',
      use: 'sig',
      kid,
      n,
      e,
      alg: 'RS256'
    };

    return { keys: [jwk] };
  }

  async sign(payload: object, options: { expiresIn: number }): Promise<string> {
    if (!this.currentKeyPair) {
      await this.initialize();
    }

    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: this.currentKeyPair!.kid
    };

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + options.expiresIn;

    const jwtPayload = {
      ...payload,
      iat: now,
      exp: expiresAt
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
    const signInput = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto.sign(
      'RSA-SHA256',
      Buffer.from(signInput),
      this.currentKeyPair!.privateKey
    );

    return `${signInput}.${signature.toString('base64url')}`;
  }

  async verify(token: string): Promise<object> {
    if (!this.currentKeyPair) {
      await this.initialize();
    }

    const [headerB64, payloadB64, signatureB64] = token.split('.');
    const signInput = `${headerB64}.${payloadB64}`;

    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    const signature = Buffer.from(signatureB64, 'base64url');

    if (header.kid !== this.currentKeyPair!.kid) {
      throw new Error('Invalid key ID');
    }

    const isValid = crypto.verify(
      'RSA-SHA256',
      Buffer.from(signInput),
      this.currentKeyPair!.publicKey,
      signature
    );

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    return payload;
  }
}
