import Link from 'next/link';
import {
  Stack,
  Title,
  Text,
  Code,
  List,
  Box,
  Anchor,
} from '@mantine/core';
import { AccentPanel, DocsPageShell, PublicShell } from '@doneisbetter/gds-core/server'
import { createDocsVersionMeta, getDocsShellProps } from '../../../lib/docs-shell-config'
// WHAT: React OAuth 2.0 integration example with complete implementation
// WHY: Developers need copy-paste ready code for React apps using SSO
// HOW: Provides AuthContext, callback handler, and protected route examples

export default function ReactExample() {
  return (
    <PublicShell {...getDocsShellProps('/docs/examples/react')}>
      <DocsPageShell
        eyebrow="Examples"
        lead="Reference React integration using OAuth Authorization Code flow with backend token exchange."
        meta={createDocsVersionMeta('SSO Version')}
        title="React Integration Example"
      >
      <Stack gap="xl">
        <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              This guide demonstrates OAuth 2.0 Authorization Code Flow integration in a React application.
              No special library is required—just standard OAuth 2.0 flow with your backend handling token exchange.
            </Text>
            <AccentPanel title="Security note" tone="red" variant="soft-outline">
              <Text size="sm">
                Never expose <code>client_secret</code> in your React app. All token exchange operations must happen on your backend server.
              </Text>
            </AccentPanel>
            <AccentPanel title="Current contract note" tone="amber" variant="soft-outline">
              <Text size="sm">
                When these examples talk about app approval state, your backend should derive it from the permission APIs and expose it through your own session endpoint. Do not assume raw <code>id_token</code> claims already contain canonical app-permission status.
              </Text>
            </AccentPanel>
        </Box>

          <Box>
            <Title order={2} mb="sm">1. Environment Setup</Title>
            <Text size="sm">Configure your environment variables (backend only):</Text>
            <Code block>
              {`# .env (Backend Only - NEVER commit this file)
SSO_CLIENT_ID=your_client_id_here
SSO_CLIENT_SECRET=your_client_secret_here
SSO_REDIRECT_URI=https://yourapp.com/api/auth/callback
SSO_BASE_URL=https://sso.doneisbetter.com
SESSION_SECRET=your_session_secret_here`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">2. AuthContext Setup</Title>
            <Text size="sm">Create a React Context to manage authentication state:</Text>
            <Code block>
              {`// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState(null);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // WHY: Verify if user has a valid session with your backend
  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include' // Include cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setPermission(data.permission ?? null); // e.g. { status: 'approved', role: 'member' }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // WHY: Redirect user to SSO authorization page
  const login = () => {
    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('oauth_state', state);

    const authUrl = new URL('https://sso.doneisbetter.com/api/oauth/authorize');
    authUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_SSO_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', window.location.origin + '/api/auth/callback');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid profile email');
    authUrl.searchParams.append('state', state);

    window.location.href = authUrl.toString();
  };

  // WHY: Clear session and redirect to SSO logout
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      setPermission(null);
      
      // Optional: Also logout from SSO
      window.location.href = 'https://sso.doneisbetter.com/api/public/logout';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      permission,
      login, 
      logout,
      isApproved: permission?.status === 'approved'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">3. Backend OAuth Callback (Next.js API Route)</Title>
            <Text size="sm">Handle the OAuth callback and exchange code for tokens:</Text>
            <Code block>
              {`// pages/api/auth/callback.js
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const { code, state } = req.query;

  // WHY: Validate state parameter to prevent CSRF attacks
  const expectedState = req.cookies.oauth_state;
  if (state !== expectedState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  try {
    // WHY: Exchange authorization code for tokens (server-side only)
    const tokenResponse = await fetch(
      \`\${process.env.SSO_BASE_URL}/api/oauth/token\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.SSO_REDIRECT_URI,
          client_id: process.env.SSO_CLIENT_ID,
          client_secret: process.env.SSO_CLIENT_SECRET // NEVER expose this to frontend
        })
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return res.status(tokenResponse.status).json(error);
    }

    const tokens = await tokenResponse.json();
    const { access_token, id_token, refresh_token } = tokens;

    // WHY: Decode ID token to get user identity claims
    const decoded = jwt.decode(id_token);
    const { sub: userId, email, name, role } = decoded;

    // WHY: Ask your backend permission layer for canonical app access state
    const permission = await getPermissionForUserAndClient({
      userId,
      clientId: process.env.SSO_CLIENT_ID
    });

    // WHY: Store tokens securely in HTTP-only cookies
    res.setHeader('Set-Cookie', [
      \`access_token=\${access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600\`,
      \`refresh_token=\${refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000\`,
      \`id_token=\${id_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600\`
    ]);

    // WHY: Check backend-derived app permission status and redirect accordingly
    if (permission?.status === 'pending') {
      return res.redirect('/access-pending');
    } else if (permission?.status === 'revoked') {
      return res.redirect('/access-denied');
    }

    // Success: Redirect to app
    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">4. Session Validation Endpoint</Title>
            <Text size="sm">Create an endpoint to check current session status:</Text>
            <Code block>
              {`// pages/api/auth/session.js
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const { id_token, access_token } = req.cookies;

  if (!id_token || !access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // WHY: Decode ID token to get user identity claims
    const decoded = jwt.decode(id_token);
    const { sub: userId, email, name, role } = decoded;

    // WHY: Check token expiration
    if (decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ error: 'Token expired' });
    }

    const permission = await getPermissionForUserAndClient({
      userId,
      clientId: process.env.SSO_CLIENT_ID
    });

    res.json({
      user: { userId, email, name, role },
      permission
    });
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ error: 'Session validation failed' });
  }
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">5. Protected Route Component</Title>
            <Text size="sm">Create a component to protect routes requiring authentication:</Text>
            <Code block>
              {`// src/components/ProtectedRoute.jsx
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export function ProtectedRoute({ children, requireApproved = true }) {
  const { user, loading, permission, isApproved } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // WHY: Redirect to login if not authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // WHY: Check app permission status
    if (requireApproved && !isApproved) {
      if (permission?.status === 'pending') {
        router.push('/access-pending');
      } else if (permission?.status === 'revoked') {
        router.push('/access-denied');
      }
    }
  }, [user, loading, permission, isApproved, requireApproved]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || (requireApproved && !isApproved)) {
    return null;
  }

  return <>{children}</>;
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">6. Usage in Your App</Title>
            <Code block>
              {`// pages/_app.js
import { AuthProvider } from '../contexts/AuthContext';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

// pages/login.js
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div>
      <Title order={1} mb="xs">Sign In</Title>
      <button onClick={login}>Sign in with SSO</button>
    </div>
  );
}

// pages/dashboard.js
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div>
        <Title order={1} mb="xs">Welcome, {user.name}</Title>
        <Text size="sm">Email: {user.email}</Text>
        <Text size="sm">Role: {user.role}</Text>
        <button onClick={logout}>Sign Out</button>
      </div>
    </ProtectedRoute>
  );
}

// pages/access-pending.js
export default function AccessPending() {
  return (
    <div>
      <Title order={1} mb="xs">Access Pending</Title>
      <Text size="sm">
        Your access to this application is pending approval.
        An administrator will review your request shortly.
      </Text>
      <Text size="sm">You will receive an email notification once approved.</Text>
    </div>
  );
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">7. Token Refresh (Optional)</Title>
            <Text size="sm">Implement automatic token refresh before expiry:</Text>
            <Code block>
              {`// pages/api/auth/refresh.js
export default async function handler(req, res) {
  const { refresh_token } = req.cookies;

  if (!refresh_token) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const tokenResponse = await fetch(
      \`\${process.env.SSO_BASE_URL}/api/oauth/token\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token,
          client_id: process.env.SSO_CLIENT_ID,
          client_secret: process.env.SSO_CLIENT_SECRET
        })
      }
    );

    if (!tokenResponse.ok) {
      return res.status(401).json({ error: 'Token refresh failed' });
    }

    const tokens = await tokenResponse.json();
    const { access_token, id_token } = tokens;

    // WHY: Update cookies with new tokens
    res.setHeader('Set-Cookie', [
      \`access_token=\${access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600\`,
      \`id_token=\${id_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600\`
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Summary</Title>
            <List spacing="xs">
              <List.Item>✅ OAuth 2.0 Authorization Code Flow implemented</List.Item>
              <List.Item>✅ Secure token handling with HTTP-only cookies</List.Item>
              <List.Item>✅ CSRF protection with state parameter</List.Item>
              <List.Item>✅ App permission status handling (pending/approved/revoked)</List.Item>
              <List.Item>✅ Protected routes with automatic redirects</List.Item>
              <List.Item>✅ Token refresh capability</List.Item>
            </List>
            <AccentPanel title="Next Steps" tone="red" variant="soft-outline">
              <List spacing="xs">
                <List.Item>Review <Anchor component={Link} href="/docs/authentication">Authentication Flow</Anchor> for detailed OAuth 2.0 explanation</List.Item>
                <List.Item>Check <Anchor component={Link} href="/docs/app-permissions">App Permissions</Anchor> to understand permission lifecycle</List.Item>
                <List.Item>See <Anchor component={Link} href="/docs/api/endpoints">API Reference</Anchor> for complete endpoint documentation</List.Item>
              </List>
            </AccentPanel>
          </Box>
        
      </Stack>
      </DocsPageShell>
    </PublicShell>
  );
}
