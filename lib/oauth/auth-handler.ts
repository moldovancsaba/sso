import { AuthorizationRequest } from './types';
import { User } from '../types/user';
import { Identity } from '../types/identity';
import { Database } from '../db/database';
import { IdentityManager } from '../identity/manager';

/**
 * Handles OAuth authentication requests, managing both the initial login form display
 * and the subsequent authentication process.
 */
export class OAuthAuthHandler {
  private readonly identityManager: IdentityManager;

  constructor(private readonly db: Database) {
    this.identityManager = new IdentityManager();
  }

  /**
   * Generates login form data for the initial OAuth authorization request
   * @param clientName Name of the OAuth client requesting authorization
   * @param redirectUri Callback URL for the OAuth flow
   * @param state OAuth state parameter for security
   * @returns Login form data with client information
   */
  async getLoginFormData(clientName: string, redirectUri: string, state: string) {
    return {
      client_name: clientName,
      redirect_uri: redirectUri,
      state,
      login_options: {
        identifier: true,
        email: true
      },
      message: 'Please authenticate to continue'
    };
  }

  /**
   * Authenticates a user based on the provided identifier
   * Creates or retrieves the user and their identity profile
   * @param identifier User's identifier (anonymous or email-based)
   * @returns Authenticated user with identity
   */
  async authenticateUser(identifier: string): Promise<User | null> {
    // Initialize identity manager if not already done
    await this.identityManager.init();
    
    // Create or update user record with current timestamp
    const now = new Date().toISOString();
    const user = await this.db.createOrUpdateUser(identifier);
    
    if (!user) {
      return null;
    }
    
    // Ensure user has an identity profile
    const identityId = user.identityId || user.id;
    const identity = await this.identityManager.getOrCreate(identityId);
    
    // Update user with identity reference
    if (!user.identityId) {
await this.db.createOrUpdateUser(user.identifier, { metadata: {...(user.metadata || {}), identityId} });
    }
    
    return {
      ...user,
      profile: {
        ...user.profile,
        nickname: identity.gametag
      }
    };
  }

  /**
   * Validates the authentication request parameters
   * @param identifier User's provided identifier
   * @param request OAuth authorization request
   * @returns Validation result and any error messages
   */
  validateAuthRequest(identifier: string, request: AuthorizationRequest): { isValid: boolean; error?: string } {
    if (identifier === 'anonymous' || !identifier || identifier.trim().length === 0) {
      return { isValid: true };
    }

    // Add additional validation as needed
    // For example, email format validation if using email authentication

    return { isValid: true };
  }
}
