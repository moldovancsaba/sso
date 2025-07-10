# SSO Integration Guide

## Table of Contents
- [Direct Integration](#direct-integration)
- [NextAuth.js Integration](#nextauthjs-integration)
- [OAuth2 Integration](#oauth2-integration)
- [API Reference](#api-reference)
- Dynamic port synchronization ensures consistent OAuth redirects
- Automatic environment detection simplifies development setup
- OAuth client setup is streamlined with environment configuration

## Direct Integration

### Installation

```bash
npm install @doneisbetter/sso
# or
yarn add @doneisbetter/sso
```

### Environment Setup

```env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_DEFAULT_API_KEY=your_api_key
```

### Basic Usage

```typescript
import { createToken, validateToken } from '@doneisbetter/sso';

// Create a token
const token = await createToken('user-identifier');

// Validate a token
const isValid = await validateToken(token);
```

## NextAuth.js Integration

### Setup OAuth Provider

1. Create an OAuth client:
   - Visit https://sso.doneisbetter.com/admin/oauth-clients
   - Click "Create New Client"
   - Enter your application name
   - For development environments:
     - Add `http://localhost/api/auth/callback/sso` as redirect URI
     - The system automatically handles any development port
   - For production:
     - Add your specific callback URL (e.g., `https://your-app.com/api/auth/callback/sso`)

2. Configure NextAuth.js:

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth';
import { OAuth2Provider } from 'next-auth/providers';

export default NextAuth({
  providers: [
    OAuth2Provider({
      id: 'sso',
      name: 'SSO',
      type: 'oauth',
      clientId: process.env.SSO_CLIENT_ID,
      clientSecret: process.env.SSO_CLIENT_SECRET,
      authorization: {
        url: 'https://sso.doneisbetter.com/api/oauth/authorize',
        params: { response_type: 'code' }
      },
      token: 'https://sso.doneisbetter.com/api/oauth/token',
      userinfo: {
        url: 'https://sso.doneisbetter.com/api/auth/validate',
        async request({ tokens }) {
          return {
            id: tokens.sub,
            identifier: tokens.identifier
          };
        }
      }
    })
  ]
});
```

3. Add environment variables:

```env
SSO_CLIENT_ID=your_client_id
SSO_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

## OAuth2 Integration

### OAuth2 Endpoints

#### Authorization Endpoint
- URL: `/api/oauth/authorize`
- Method: `GET` / `POST`
- Parameters:
  - `client_id`: Your OAuth client ID
  - `redirect_uri`: Your callback URL
  - `response_type`: Must be "code"
  - `state`: (Optional) State parameter for security

#### Token Endpoint
- URL: `/api/oauth/token`
- Method: `POST`
- Parameters:
  - `grant_type`: Must be "authorization_code"
  - `code`: The authorization code
  - `client_id`: Your OAuth client ID
  - `client_secret`: Your OAuth client secret
  - `redirect_uri`: Must match the authorization redirect URI

### Example Flow

1. Redirect user to:
```
https://sso.doneisbetter.com/api/oauth/authorize?
  client_id=your_client_id&
  redirect_uri=your_callback_url&
  response_type=code&
  state=random_state_string
```

2. Exchange code for token:
```typescript
const response = await fetch('https://sso.doneisbetter.com/api/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: auth_code,
    client_id: your_client_id,
    client_secret: your_client_secret,
    redirect_uri: your_callback_url
  })
});

const { access_token } = await response.json();
```

## API Reference

### Authentication Endpoints

#### Create Token
- `POST /api/auth/create`
- Headers:
  - `X-API-Key`: Your API key
- Body:
  ```json
  {
    "identifier": "user-identifier"
  }
  ```

#### Validate Token
- `POST /api/auth/validate`
- Headers:
  - `X-API-Key`: Your API key
- Body:
  ```json
  {
    "token": "jwt-token"
  }
  ```

### OAuth2 Management

#### List OAuth Clients
- `GET /api/oauth/clients`
- Headers:
  - `X-API-Key`: Your API key

#### Create OAuth Client
- `POST /api/oauth/clients`
- Headers:
  - `X-API-Key`: Your API key
- Body:
  ```json
  {
    "name": "Application Name",
    "redirectUris": ["https://your-app.com/callback"]
  }
  ```

### Security Considerations

1. Always use HTTPS in production
2. Validate all tokens on your server
3. Store client secrets securely
4. Use state parameter in OAuth flow
5. Implement proper error handling

### Rate Limiting

The SSO service implements rate limiting:
- 100 requests per minute per API key
- 10 burst requests allowed
- Applies to all authentication endpoints
