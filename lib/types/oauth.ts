export interface OAuthClient {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  createdAt: string;
  updatedAt: string;
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
