import { Database } from '../db/database';
import { AuthorizationRequest, TokenRequest, OAuthToken, TokenIntrospectionResponse } from './types';
export declare class OAuthService {
    private readonly db;
    private authCodes;
    private tokens;
    constructor(db: Database);
    private cleanupExpiredTokens;
    validateAuthorizationRequest(request: AuthorizationRequest): Promise<void>;
    createAuthorizationCode(request: AuthorizationRequest, userId?: string, identifier?: string): Promise<string>;
    private generateTokens;
    handleAuthorizationCodeGrant(request: TokenRequest): Promise<OAuthToken>;
    handleClientCredentialsGrant(request: TokenRequest): Promise<OAuthToken>;
    handlePasswordGrant(request: TokenRequest): Promise<OAuthToken>;
    handleRefreshTokenGrant(request: TokenRequest): Promise<OAuthToken>;
    validateToken(token: string): Promise<TokenIntrospectionResponse>;
    revokeToken(token: string): Promise<void>;
}
//# sourceMappingURL=service.d.ts.map