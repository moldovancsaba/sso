# @doneisbetter/sso-client

Cookie-based SSO authentication client for `*.doneisbetter.com` subdomains.

**Version:** 5.1.0  
**Last Updated:** 2025-10-04

## Installation

```bash
npm install @doneisbetter/sso-client
```

## Requirements

- Your app MUST be on a `*.doneisbetter.com` subdomain
- Node.js >= 18.0.0
- Next.js (for server-side rendering)

## Quick Start

### 1. Set Environment Variable

⚠️ **CRITICAL**: Use `printf` (NOT `echo`) to avoid trailing newlines!

```bash
# Good - No newline
printf "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production

# Bad - Adds newline (causes 500 errors!)
echo "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production
```

### 2. Protect Your Pages

```typescript
import { validateSsoSession, getSsoLoginUrl } from '@doneisbetter/sso-client';

export async function getServerSideProps(context) {
  const { isValid, user } = await validateSsoSession(context.req);
  
  if (!isValid) {
    const loginUrl = getSsoLoginUrl(
      `https://yourapp.doneisbetter.com${context.resolvedUrl}`
    );
    
    return {
      redirect: {
        destination: loginUrl,
        permanent: false,
      },
    };
  }
  
  return {
    props: { user },
  };
}

export default function ProtectedPage({ user }) {
  return <div>Welcome, {user.name}!</div>;
}
```

## API

### `validateSsoSession(req, options?)`

Validates SSO session by forwarding cookies to SSO service.

**Parameters:**
- `req` - Next.js request object with `headers.cookie`
- `options` - Optional configuration
  - `ssoServerUrl` - Override SSO server URL
  - `cookieHeader` - Override cookie header
  - `userAgent` - Override user agent

**Returns:** `Promise<SSOValidationResponse>`
```typescript
{
  isValid: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
  };
  message?: string;
}
```

### `getSsoLoginUrl(returnUrl, ssoServerUrl?)`

Generates SSO login URL with redirect parameter.

**Parameters:**
- `returnUrl` - URL to redirect back to after login
- `ssoServerUrl` - Optional SSO server URL override

**Returns:** `string` - Full login URL

### `getSsoLogoutUrl(ssoServerUrl?)`

Gets SSO logout endpoint URL.

**Parameters:**
- `ssoServerUrl` - Optional SSO server URL override

**Returns:** `string` - Logout URL

## Common Issues

### 500 Error on Protected Pages

**Cause:** Environment variable has trailing newline

**Solution:**
```bash
vercel env rm SSO_SERVER_URL production
printf "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production
git commit --allow-empty -m "fix: Redeploy with clean SSO_SERVER_URL"
git push origin main
```

### Session Not Validating

**Cause:** Cookies not being forwarded

**Solution:** Ensure you're passing `context.req` to `validateSsoSession`:
```typescript
// ✅ Correct
const { isValid } = await validateSsoSession(context.req);

// ❌ Wrong
const { isValid } = await validateSsoSession(req); // undefined
```

## Complete Integration Guide

For a comprehensive guide with troubleshooting, see:
https://github.com/moldovancsaba/sso/blob/main/docs/SSO_INTEGRATION_GUIDE.md

## License

MIT

## Support

- Documentation: https://sso.doneisbetter.com/docs
- GitHub: https://github.com/moldovancsaba/sso
- Issues: https://github.com/moldovancsaba/sso/issues
