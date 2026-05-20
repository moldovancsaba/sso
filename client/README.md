# @doneisbetter/sso-client

Browser-oriented TypeScript client for interacting with the DoneIsBetter SSO service.

**Version:** 5.1.0  
**Last Updated:** 2026-05-20

## What This Package Exports

The package exports a single primary class:

- `SSOClient`

It also re-exports:

- public TypeScript types from [`/Users/moldovancsaba/Projects/sso/src/types.ts`](/Users/moldovancsaba/Projects/sso/src/types.ts)
- constants from [`/Users/moldovancsaba/Projects/sso/src/constants.ts`](/Users/moldovancsaba/Projects/sso/src/constants.ts)

## Installation

```bash
npm install @doneisbetter/sso-client
```

## Basic Usage

```ts
import { SSOClient } from '@doneisbetter/sso-client';

const sso = new SSOClient({
  serverUrl: 'https://sso.doneisbetter.com',
});

const session = await sso.validateSession();

if (!session.isValid) {
  sso.redirectToLogin(window.location.href);
}
```

## API

### `new SSOClient(config)`

Configuration:

```ts
{
  serverUrl: 'https://sso.doneisbetter.com',
  paths?: {
    login?: string;
    logout?: string;
    validate?: string;
  },
  headers?: Record<string, string>;
}
```

Notes:

- `serverUrl` is required.
- `paths` lets you override endpoint paths if your deployment uses non-default routing.
- The client sends requests with `credentials: 'include'`.

### `validateSession()`

Calls the configured validation endpoint and returns a `Promise<SessionResponse>`.

### `redirectToLogin(returnUrl?)`

Redirects the browser to the configured login endpoint. When provided, `returnUrl` is appended as a query parameter.

### `signOut()`

Calls the configured logout endpoint with `POST`.

### `enableSessionMonitoring(config?)`

Starts periodic session validation.

```ts
const stopMonitoring = sso.enableSessionMonitoring({
  interval: 60_000,
  onInvalidSession: () => {
    window.location.href = '/login';
  },
  onError: (error) => {
    console.error(error);
  },
});

// later
stopMonitoring();
```

## Important Notes

- This package is a thin browser client. It does not implement the OAuth authorization-code exchange for you.
- For new third-party integrations, the recommended default remains OAuth 2.0 Authorization Code flow plus OIDC claims.
- Shared-domain cookie-session integrations should validate the hosted SSO session instead of assuming local auth state.

## Documentation

- Runtime integration guide: [docs/THIRD_PARTY_INTEGRATION_GUIDE.md](/Users/moldovancsaba/Projects/sso/docs/THIRD_PARTY_INTEGRATION_GUIDE.md)
- Authentication guide: [docs/README.md](/Users/moldovancsaba/Projects/sso/docs/README.md)
- Source exports: [`/Users/moldovancsaba/Projects/sso/src/index.ts`](/Users/moldovancsaba/Projects/sso/src/index.ts)

## License

MIT
