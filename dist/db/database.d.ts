import { TenantDocument } from '../types/tenant';
import { User } from '../types/user';
import { OAuthClient, OAuthToken, OAuthCode, OAuthConsent, AuditLog } from '../types/oauth';
import { URLConfigDocument, URLConfigCreateInput, URLConfigUpdateInput } from '../types/url-config';
import { Identity, IdentityDocument } from '../types/identity';
import { AuthData, AuthDataCreateInput, AuthTokensUpdateInput } from '../types/auth-data';
export declare class Database {
    private static instance;
    private client;
    private db;
    private constructor();
    static getInstance(): Promise<Database>;
    validateApiKey(apiKey: string): Promise<TenantDocument | null>;
    createOAuthClient(name: string, redirectUris: string[]): Promise<OAuthClient>;
    validateOAuthClient(clientId: string, clientSecret?: string): Promise<OAuthClient | null>;
    listOAuthClients(): Promise<OAuthClient[]>;
    updateUser(id: string, update: Partial<User>): Promise<User | null>;
    updateOAuthClient(id: string, update: Partial<OAuthClient>): Promise<OAuthClient | null>;
    findUser(identifierOrEmail: string): Promise<User | null>;
    createOrUpdateUser(identifier: string, options?: {
        email?: string;
        emailVerified?: boolean;
        profile?: {
            name?: string;
            givenName?: string;
            familyName?: string;
            middleName?: string;
            nickname?: string;
            preferredUsername?: string;
            picture?: string;
            website?: string;
            gender?: string;
            birthdate?: string;
            zoneinfo?: string;
            locale?: string;
            phoneNumber?: string;
            phoneNumberVerified?: boolean;
            address?: {
                formatted?: string;
                streetAddress?: string;
                locality?: string;
                region?: string;
                postalCode?: string;
                country?: string;
            };
        };
        metadata?: {
            [key: string]: any;
        };
        emoji?: string;
        color?: string;
    }): Promise<User>;
    createURLConfig(input: URLConfigCreateInput): Promise<URLConfigDocument>;
    updateURLConfig(id: string, input: URLConfigUpdateInput): Promise<URLConfigDocument | null>;
    deleteURLConfig(id: string): Promise<boolean>;
    getURLConfig(id: string): Promise<URLConfigDocument | null>;
    getDefaultURLConfig(environment: string): Promise<URLConfigDocument | null>;
    listURLConfigs(tenantId?: string): Promise<URLConfigDocument[]>;
    validateCallbackUrl(url: string, environment: string): Promise<boolean>;
    createIdentity(identity: Identity): Promise<IdentityDocument>;
    getIdentity(id: string): Promise<IdentityDocument | null>;
    updateIdentity(id: string, update: Partial<Identity>): Promise<IdentityDocument | null>;
    deleteIdentity(id: string): Promise<boolean>;
    linkAuthData(userId: string, authData: AuthDataCreateInput): Promise<void>;
    unlinkAuthData(userId: string, provider: string): Promise<boolean>;
    getAuthDataForUser(userId: string): Promise<Array<AuthData>>;
    findUserByAuthData(provider: string, providerId: string): Promise<User | null>;
    updateAuthTokens(userId: string, provider: string, tokens: AuthTokensUpdateInput): Promise<boolean>;
    createOAuthToken(token: Omit<OAuthToken, 'createdAt'>): Promise<OAuthToken>;
    getOAuthToken(accessToken: string): Promise<OAuthToken | null>;
    getOAuthTokenByRefresh(refreshToken: string): Promise<OAuthToken | null>;
    deleteOAuthToken(accessToken: string): Promise<boolean>;
    createOAuthCode(code: Omit<OAuthCode, 'createdAt'>): Promise<OAuthCode>;
    getOAuthCode(code: string): Promise<OAuthCode | null>;
    markOAuthCodeAsUsed(code: string): Promise<boolean>;
    createOrUpdateConsent(consent: Omit<OAuthConsent, 'createdAt'>): Promise<OAuthConsent>;
    getConsent(userId: string, clientId: string): Promise<OAuthConsent | null>;
    revokeConsent(userId: string, clientId: string): Promise<boolean>;
    createAuditLog(log: Omit<AuditLog, 'timestamp'>): Promise<AuditLog>;
    getAuditLogs(query: {
        eventType?: string;
        actorId?: string;
        targetId?: string;
        fromTimestamp?: string;
        toTimestamp?: string;
        limit?: number;
    }): Promise<AuditLog[]>;
    validateUserCredentials(username: string, password: string): Promise<User | null>;
    createOrUpdateUserWithAuth(identifier: string, authData: AuthDataCreateInput, options?: {
        email?: string;
        emoji?: string;
        color?: string;
    }): Promise<User>;
    listUsers(): Promise<User[]>;
}
//# sourceMappingURL=database.d.ts.map