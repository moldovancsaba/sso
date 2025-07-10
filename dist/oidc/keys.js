import crypto from 'crypto';
import { promisify } from 'util';
const generateKeyPair = promisify(crypto.generateKeyPair);
export class KeyManager {
    constructor() {
        this.currentKeyPair = null;
    }
    static getInstance() {
        if (!KeyManager.instance) {
            KeyManager.instance = new KeyManager();
        }
        return KeyManager.instance;
    }
    async initialize() {
        if (this.currentKeyPair)
            return;
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
    getKeyComponents(publicKey) {
        const jwk = publicKey.export({ format: 'jwk' });
        return {
            n: jwk.n,
            e: jwk.e
        };
    }
    async getJWKS() {
        if (!this.currentKeyPair) {
            await this.initialize();
        }
        const { publicKey, kid } = this.currentKeyPair;
        const { n, e } = this.getKeyComponents(publicKey);
        const jwk = {
            kty: 'RSA',
            use: 'sig',
            kid,
            n,
            e,
            alg: 'RS256'
        };
        return { keys: [jwk] };
    }
    async sign(payload, options) {
        if (!this.currentKeyPair) {
            await this.initialize();
        }
        const header = {
            alg: 'RS256',
            typ: 'JWT',
            kid: this.currentKeyPair.kid
        };
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = now + options.expiresIn;
        const jwtPayload = Object.assign(Object.assign({}, payload), { iat: now, exp: expiresAt });
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
        const signInput = `${encodedHeader}.${encodedPayload}`;
        const signature = crypto.sign('RSA-SHA256', Buffer.from(signInput), this.currentKeyPair.privateKey);
        return `${signInput}.${signature.toString('base64url')}`;
    }
    async verify(token) {
        if (!this.currentKeyPair) {
            await this.initialize();
        }
        const [headerB64, payloadB64, signatureB64] = token.split('.');
        const signInput = `${headerB64}.${payloadB64}`;
        const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        const signature = Buffer.from(signatureB64, 'base64url');
        if (header.kid !== this.currentKeyPair.kid) {
            throw new Error('Invalid key ID');
        }
        const isValid = crypto.verify('RSA-SHA256', Buffer.from(signInput), this.currentKeyPair.publicKey, signature);
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
//# sourceMappingURL=keys.js.map