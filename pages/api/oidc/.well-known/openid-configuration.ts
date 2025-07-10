import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const baseUrl = process.env.OIDC_ISSUER || 'https://auth.yourdomain.com';

  const config = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/oidc/auth`,
    token_endpoint: `${baseUrl}/api/oidc/token`,
    userinfo_endpoint: `${baseUrl}/api/oidc/userinfo`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    registration_endpoint: `${baseUrl}/api/oidc/register`,
    scopes_supported: [
      'openid',
      'profile',
      'email',
      'address',
      'phone'
    ],
    response_types_supported: [
      'code',
      'id_token',
      'token id_token',
      'code id_token',
      'code token',
      'code token id_token'
    ],
    grant_types_supported: [
      'authorization_code',
      'implicit',
      'refresh_token',
      'client_credentials'
    ],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    token_endpoint_auth_methods_supported: [
      'client_secret_basic',
      'client_secret_post',
      'private_key_jwt'
    ],
    claims_supported: [
      'sub',
      'iss',
      'auth_time',
      'acr',
      'name',
      'given_name',
      'family_name',
      'nickname',
      'profile',
      'picture',
      'website',
      'email',
      'email_verified',
      'locale',
      'zoneinfo'
    ],
    claims_parameter_supported: true,
    request_parameter_supported: true,
    request_uri_parameter_supported: true,
    require_request_uri_registration: true,
    code_challenge_methods_supported: ['S256', 'plain'],
    check_session_iframe: `${baseUrl}/api/oidc/check-session`,
    end_session_endpoint: `${baseUrl}/api/oidc/end-session`,
    backchannel_logout_supported: true,
    backchannel_logout_session_supported: true,
    frontchannel_logout_supported: true,
    frontchannel_logout_session_supported: true
  };

  res.json(config);
}
