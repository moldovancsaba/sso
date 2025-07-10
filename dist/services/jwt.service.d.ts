import { Secret, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { JWTPayload } from '../interfaces/jwt.interface';
export declare class JWTService {
    /**
     * Signs a JWT token with the given payload and secret
     * @param payload - The data to be included in the token
     * @param secret - The secret key used to sign the token
     * @param options - Optional signing configuration
     * @returns A Promise that resolves to the signed JWT string
     */
    signToken(payload: JWTPayload, secret: Secret, options?: SignOptions): Promise<string>;
    /**
     * Verifies and decodes a JWT token
     * @param token - The JWT string to verify
     * @param secret - The secret key used to verify the token
     * @param options - Optional verification configuration
     * @returns A Promise that resolves to the decoded token payload
     */
    verifyToken(token: string, secret: Secret, options?: VerifyOptions): Promise<JWTPayload>;
}
//# sourceMappingURL=jwt.service.d.ts.map