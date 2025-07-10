import { promisify } from 'util';
import { Secret, SignOptions, VerifyOptions, sign, verify } from 'jsonwebtoken';
import { JWTPayload } from '../interfaces/jwt.interface';

// Promisify JWT functions
const signAsync = (payload: JWTPayload, secret: Secret, options?: SignOptions): Promise<string> => {
  return new Promise((resolve, reject) => {
    sign(payload, secret, options || {}, (err, token) => {
      if (err) return reject(err);
      if (!token) return reject(new Error('Token generation failed'));
      resolve(token);
    });
  });
};

const verifyAsync = (token: string, secret: Secret, options?: VerifyOptions): Promise<JWTPayload> => {
  return new Promise((resolve, reject) => {
    verify(token, secret, options || {}, (err, decoded) => {
      if (err) return reject(err);
      if (!decoded || typeof decoded !== 'object') return reject(new Error('Invalid token payload'));
      resolve(decoded as JWTPayload);
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
  async signToken(payload: JWTPayload, secret: Secret, options?: SignOptions): Promise<string> {
    return signAsync(payload, secret, options || {});
  }

  /**
   * Verifies and decodes a JWT token
   * @param token - The JWT string to verify
   * @param secret - The secret key used to verify the token
   * @param options - Optional verification configuration
   * @returns A Promise that resolves to the decoded token payload
   */
  async verifyToken(token: string, secret: Secret, options?: VerifyOptions): Promise<JWTPayload> {
    return verifyAsync(token, secret, options || {});
  }
}
