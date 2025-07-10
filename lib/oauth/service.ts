import { Database } from '../db/database';
import {
  AuthorizationRequest,
  TokenRequest,
  OAuthToken,
  TokenIntrospectionResponse,
  OAuthError,
  validateRedirectUri,
  verifyPKCE,
  generateAuthCode,
  isValidScope,
} from './types';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_EXPIRY = 3600; // 1 hour in seconds
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 3600; // 30 days in seconds

interface StoredAuthCode {
  code: string;
  clientId: string;
  redirectUri: string;
  userId?: string;
  identifier?: string;
  scope?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  expiresAt: Date;
}

interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  clientId: string;
  scope?: string;
  expiresAt: Date;
}

export class OAuthService {
  private authCodes = new Map<string, StoredAuthCode>();
  private tokens = new Map<string, StoredToken>();

  constructor(private readonly db: Database) {}

  private cleanupExpiredTokens() {
    const now = new Date();
    for (const [code, data] of this.authCodes.entries()) {
      if (data.expiresAt < now) {
        this.authCodes.delete(code);
      }
    }
    for (const [token, data] of this.tokens.entries()) {
      if (data.expiresAt < now) {
        this.tokens.delete(token);
      }
    }
  }

  async validateAuthorizationRequest(request: AuthorizationRequest): Promise<void> {
    const client = await this.db.validateOAuthClient(request.clientId);
    if (!client) {
      throw new OAuthError('invalid_client', 'Client not found or invalid');
    }

    if (!validateRedirectUri(client.redirectUris, request.redirectUri)) {
      throw new OAuthError('invalid_request', 'Invalid redirect URI');
    }

    if (request.scope && !isValidScope(request.scope)) {
      throw new OAuthError('invalid_scope', 'Invalid scope format');
    }

    if (request.codeChallenge) {
      if (!request.codeChallengeMethod || !['S256', 'plain'].includes(request.codeChallengeMethod)) {
        throw new OAuthError('invalid_request', 'Invalid or missing code challenge method');
      }
    }
  }

  async createAuthorizationCode(
    request: AuthorizationRequest,
    userId?: string,
    identifier?: string
  ): Promise<string> {
    const code = generateAuthCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    this.authCodes.set(code, {
      code,
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      userId,
      identifier,
      scope: request.scope,
      codeChallenge: request.codeChallenge,
      codeChallengeMethod: request.codeChallengeMethod,
      expiresAt,
    });

    // Cleanup expired codes
    this.cleanupExpiredTokens();

    return code;
  }

  private generateTokens(
    userId: string,
    clientId: string,
    scope?: string
  ): { accessToken: string; refreshToken: string; expiresIn: number } {
    const accessToken = jwt.sign(
      {
        sub: userId,
        client_id: clientId,
        scope,
        type: 'Bearer',
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY * 1000);

    this.tokens.set(accessToken, {
      accessToken,
      refreshToken,
      userId,
      clientId,
      scope,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_EXPIRY,
    };
  }

  async handleAuthorizationCodeGrant(request: TokenRequest): Promise<OAuthToken> {
    if (!request.code || !request.redirectUri) {
      throw new OAuthError('invalid_request', 'Code and redirect URI are required');
    }

    const storedCode = this.authCodes.get(request.code);
    if (!storedCode || storedCode.expiresAt < new Date()) {
      throw new OAuthError('invalid_grant', 'Invalid or expired authorization code');
    }

    if (
      storedCode.clientId !== request.clientId ||
      storedCode.redirectUri !== request.redirectUri
    ) {
      throw new OAuthError('invalid_grant', 'Code was not issued to this client');
    }

    if (storedCode.codeChallenge && !request.codeVerifier) {
      throw new OAuthError('invalid_grant', 'Code verifier required for PKCE');
    }

    if (storedCode.codeChallenge && request.codeVerifier) {
      const validPKCE = verifyPKCE(
        request.codeVerifier,
        storedCode.codeChallenge,
        storedCode.codeChallengeMethod || 'plain'
      );
      if (!validPKCE) {
        throw new OAuthError('invalid_grant', 'Invalid code verifier');
      }
    }

    // Delete the used code
    this.authCodes.delete(request.code);

    // Create or get user
    const user = await this.db.createOrUpdateUser(storedCode.identifier!);

    const { accessToken, refreshToken, expiresIn } = this.generateTokens(
      user.id,
      request.clientId,
      storedCode.scope
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      refreshToken,
      scope: storedCode.scope,
    };
  }

  async handleClientCredentialsGrant(request: TokenRequest): Promise<OAuthToken> {
    const client = await this.db.validateOAuthClient(request.clientId, request.clientSecret);
    if (!client) {
      throw new OAuthError('invalid_client', 'Invalid client credentials');
    }

    if (request.scope && !isValidScope(request.scope)) {
      throw new OAuthError('invalid_scope', 'Invalid scope format');
    }

    const { accessToken, expiresIn } = this.generateTokens(
      client.id,
      client.clientId,
      request.scope
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      scope: request.scope,
    };
  }

  async handlePasswordGrant(request: TokenRequest): Promise<OAuthToken> {
    if (!request.username || !request.password) {
      throw new OAuthError('invalid_request', 'Username and password required');
    }

    const client = await this.db.validateOAuthClient(request.clientId, request.clientSecret);
    if (!client) {
      throw new OAuthError('invalid_client', 'Invalid client credentials');
    }

    // Validate user credentials - implement your own user validation logic
    const user = await this.db.validateUserCredentials(request.username, request.password);
    if (!user) {
      throw new OAuthError('invalid_grant', 'Invalid user credentials');
    }

    const { accessToken, refreshToken, expiresIn } = this.generateTokens(
      user.id,
      request.clientId,
      request.scope
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      refreshToken,
      scope: request.scope,
    };
  }

  async handleRefreshTokenGrant(request: TokenRequest): Promise<OAuthToken> {
    if (!request.refreshToken) {
      throw new OAuthError('invalid_request', 'Refresh token required');
    }

    const client = await this.db.validateOAuthClient(request.clientId, request.clientSecret);
    if (!client) {
      throw new OAuthError('invalid_client', 'Invalid client credentials');
    }

    // Find the token entry by refresh token
    const tokenEntry = Array.from(this.tokens.values()).find(
      (t) => t.refreshToken === request.refreshToken
    );

    if (!tokenEntry || tokenEntry.expiresAt < new Date()) {
      throw new OAuthError('invalid_grant', 'Invalid or expired refresh token');
    }

    if (tokenEntry.clientId !== request.clientId) {
      throw new OAuthError('invalid_grant', 'Refresh token was not issued to this client');
    }

    // Delete old tokens
    this.tokens.delete(tokenEntry.accessToken);

    // Generate new tokens
    const { accessToken, refreshToken, expiresIn } = this.generateTokens(
      tokenEntry.userId,
      request.clientId,
      request.scope || tokenEntry.scope
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      refreshToken,
      scope: request.scope || tokenEntry.scope,
    };
  }

  async validateToken(token: string): Promise<TokenIntrospectionResponse> {
    try {
      const tokenEntry = this.tokens.get(token);
      if (!tokenEntry || tokenEntry.expiresAt < new Date()) {
        return { active: false };
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        active: true,
        scope: tokenEntry.scope,
        clientId: tokenEntry.clientId,
        sub: tokenEntry.userId,
        exp: Math.floor(tokenEntry.expiresAt.getTime() / 1000),
        iat: decoded.iat,
      };
    } catch {
      return { active: false };
    }
  }

  async revokeToken(token: string): Promise<void> {
    this.tokens.delete(token);
  }
}
