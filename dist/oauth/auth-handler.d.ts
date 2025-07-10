import { AuthorizationRequest } from './types';
import { User } from '../types/user';
import { Database } from '../db/database';
/**
 * Handles OAuth authentication requests, managing both the initial login form display
 * and the subsequent authentication process.
 */
export declare class OAuthAuthHandler {
    private readonly db;
    private readonly identityManager;
    constructor(db: Database);
    /**
     * Generates login form data for the initial OAuth authorization request
     * @param clientName Name of the OAuth client requesting authorization
     * @param redirectUri Callback URL for the OAuth flow
     * @param state OAuth state parameter for security
     * @returns Login form data with client information
     */
    getLoginFormData(clientName: string, redirectUri: string, state: string): Promise<{
        client_name: string;
        redirect_uri: string;
        state: string;
        login_options: {
            identifier: boolean;
            email: boolean;
        };
        message: string;
    }>;
    /**
     * Authenticates a user based on the provided identifier
     * Creates or retrieves the user and their identity profile
     * @param identifier User's identifier (anonymous or email-based)
     * @returns Authenticated user with identity
     */
    authenticateUser(identifier: string): Promise<User | null>;
    /**
     * Validates the authentication request parameters
     * @param identifier User's provided identifier
     * @param request OAuth authorization request
     * @returns Validation result and any error messages
     */
    validateAuthRequest(identifier: string, request: AuthorizationRequest): {
        isValid: boolean;
        error?: string;
    };
}
//# sourceMappingURL=auth-handler.d.ts.map