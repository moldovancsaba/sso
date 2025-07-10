import { IncomingMessage } from 'http';
export interface OAuthClient {
    id: string;
    name: string;
    clientId: string;
    clientSecret: string;
    redirectUris: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface OAuthToken {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    refreshToken?: string;
    scope?: string;
}
export interface TokenIntrospectionResponse {
    active: boolean;
    scope?: string;
    clientId?: string;
    username?: string;
    exp?: number;
    iat?: number;
    sub?: string;
    aud?: string;
    iss?: string;
}
export interface PKCEParams {
    codeChallenge: string;
    codeChallengeMethod: 'S256' | 'plain';
}
export interface AuthorizationRequest {
    clientId: string;
    redirectUri: string;
    responseType: 'code';
    state?: string;
    scope?: string;
    codeChallenge?: string;
    codeChallengeMethod?: 'S256' | 'plain';
}
export interface TokenRequest {
    grantType: 'authorization_code' | 'client_credentials' | 'password' | 'refresh_token';
    code?: string;
    redirectUri?: string;
    clientId: string;
    clientSecret: string;
    scope?: string;
    username?: string;
    password?: string;
    refreshToken?: string;
    codeVerifier?: string;
}
export declare class OAuthError extends Error {
    readonly error: string;
    readonly errorDescription?: string | undefined;
    readonly errorUri?: string | undefined;
    constructor(error: string, errorDescription?: string | undefined, errorUri?: string | undefined);
}
export declare function isValidScope(scope: string): boolean;
export declare function validateRedirectUri(allowedUris: string[], redirectUri: string): boolean;
export declare function generateState(): string;
export declare function verifyPKCE(codeVerifier: string, storedChallenge: string, method: 'S256' | 'plain'): boolean;
export declare function generateAuthCode(): string;
export declare function getClientCredentials(req: IncomingMessage): {
    clientId?: string;
    clientSecret?: string;
};
//# sourceMappingURL=types.d.ts.map