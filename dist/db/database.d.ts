import { TenantDocument } from '../types/tenant';
import { User } from '../types/user';
import { OAuthClient } from '../types/oauth';
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
    findUser(identifierOrEmail: string): Promise<User | null>;
    createOrUpdateUser(identifier: string, email?: string): Promise<User>;
    listUsers(): Promise<User[]>;
}
//# sourceMappingURL=database.d.ts.map