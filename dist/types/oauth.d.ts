import { ObjectId } from 'mongodb';
export interface OAuthClient {
    _id?: ObjectId;
    id: string;
    name: string;
    clientId: string;
    clientSecret: string;
    redirectUris: string[];
    applicationType?: 'web' | 'native' | 'service';
    clientUri?: string;
    logoUri?: string;
    contacts?: string[];
    policyUri?: string;
    tosUri?: string;
    jwksUri?: string;
    jwks?: any;
    subjectType?: 'public' | 'pairwise';
    sectorIdentifierUri?: string;
    grantTypes?: string[];
    responseTypes?: string[];
    defaultAcrValues?: string[];
    initiateLoginUri?: string;
    requestUris?: string[];
    postLogoutRedirectUris?: string[];
    defaultMaxAge?: number;
    requireAuthTime?: boolean;
    accessTokenTTL?: number;
    refreshTokenTTL?: number;
    idTokenTTL?: number;
    createdAt: string;
    updatedAt: string;
}
export interface OAuthToken {
    userId: string;
    clientId: string;
    accessToken: string;
    refreshToken?: string;
    tokenType: 'Bearer';
    scope?: string;
    expiresAt: string;
    createdAt: string;
}
export interface OAuthCode {
    code: string;
    userId: string;
    clientId: string;
    scope?: string;
    expiresAt: string;
    createdAt: string;
    usedAt?: string;
}
export interface OAuthConsent {
    userId: string;
    clientId: string;
    scope: string;
    createdAt: string;
    expiresAt?: string;
}
export interface AuditLog {
    eventType: string;
    timestamp: string;
    actorType: 'user' | 'client' | 'system';
    actorId: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, any>;
    ip?: string;
    userAgent?: string;
}
export interface TokenResponse {
    access_token: string;
    token_type: 'Bearer';
    expires_in: number;
    scope?: string;
}
export interface OAuthRequest {
    client_id: string;
    client_secret?: string;
    redirect_uri?: string;
    grant_type?: 'authorization_code' | 'refresh_token' | 'client_credentials';
    code?: string;
    refresh_token?: string;
    scope?: string;
}
//# sourceMappingURL=oauth.d.ts.map