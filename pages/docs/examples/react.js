// WHAT: React OAuth 2.0 integration example with complete implementation
// WHY: Developers need copy-paste ready code for React apps using SSO
// HOW: Provides AuthContext, callback handler, and protected route examples

import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function ReactExample() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>React Integration Example</h1>
          <p className={styles.version}>SSO Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              This guide demonstrates OAuth 2.0 Authorization Code Flow integration in a React application.
              No special library is required—just standard OAuth 2.0 flow with your backend handling token exchange.
            </p>
            <div className={styles.alert}>
              <strong>⚠️ Security Note:</strong> Never expose <code>client_secret</code> in your React app.
              All token exchange operations must happen on your backend server.
            </div>
          </section>

          <section className={styles.section}>
            <h2>1. Environment Setup</h2>
            <p>Configure your environment variables (backend only):</p>
            <div className={styles.codeBlock}>
              <pre>
                {`# .env (Backend Only - NEVER commit this file)
SSO_CLIENT_ID=your_client_id_here
SSO_CLIENT_SECRET=your_client_secret_here
SSO_REDIRECT_URI=https://yourapp.com/api/auth/callback
SSO_BASE_URL=https://sso.doneisbetter.com
SESSION_SECRET=your_session_secret_here`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>2. AuthContext Setup</h2>
            <p>Create a React Context to manage authentication state:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState(null);

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
        setPermissionStatus(data.permissionStatus); // 'approved', 'pending', 'revoked'
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
      setPermissionStatus(null);
      
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
      permissionStatus,
      login, 
      logout,
      isApproved: permissionStatus === 'approved'
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
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>3. Backend OAuth Callback (Next.js API Route)</h2>
            <p>Handle the OAuth callback and exchange code for tokens:</p>
            <div className={styles.codeBlock}>
              <pre>
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

    // WHY: Decode ID token to get user info and app permissions
    const decoded = jwt.decode(id_token);
    const { sub: userId, email, name, role, permissionStatus } = decoded;

    // WHY: Store tokens securely in HTTP-only cookies
    res.setHeader('Set-Cookie', [
      \`access_token=\${access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600\`,
      \`refresh_token=\${refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000\`,
      \`id_token=\${id_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600\`
    ]);

    // WHY: Check app permission status and redirect accordingly
    if (permissionStatus === 'pending') {
      return res.redirect('/access-pending');
    } else if (permissionStatus === 'revoked') {
      return res.redirect('/access-denied');
    }

    // Success: Redirect to app
    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>4. Session Validation Endpoint</h2>
            <p>Create an endpoint to check current session status:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// pages/api/auth/session.js
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const { id_token, access_token } = req.cookies;

  if (!id_token || !access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // WHY: Decode ID token to get user info and permission status
    const decoded = jwt.decode(id_token);
    const { sub: userId, email, name, role, permissionStatus } = decoded;

    // WHY: Check token expiration
    if (decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ error: 'Token expired' });
    }

    res.json({
      user: { userId, email, name, role },
      permissionStatus
    });
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ error: 'Session validation failed' });
  }
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>5. Protected Route Component</h2>
            <p>Create a component to protect routes requiring authentication:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// src/components/ProtectedRoute.jsx
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export function ProtectedRoute({ children, requireApproved = true }) {
  const { user, loading, permissionStatus, isApproved } = useAuth();
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
      if (permissionStatus === 'pending') {
        router.push('/access-pending');
      } else if (permissionStatus === 'revoked') {
        router.push('/access-denied');
      }
    }
  }, [user, loading, permissionStatus, isApproved, requireApproved]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || (requireApproved && !isApproved)) {
    return null;
  }

  return <>{children}</>;
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>6. Usage in Your App</h2>
            <div className={styles.codeBlock}>
              <pre>
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
      <h1>Sign In</h1>
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
        <h1>Welcome, {user.name}</h1>
        <p>Email: {user.email}</p>
        <p>Role: {user.role}</p>
        <button onClick={logout}>Sign Out</button>
      </div>
    </ProtectedRoute>
  );
}

// pages/access-pending.js
export default function AccessPending() {
  return (
    <div>
      <h1>Access Pending</h1>
      <p>
        Your access to this application is pending approval.
        An administrator will review your request shortly.
      </p>
      <p>You will receive an email notification once approved.</p>
    </div>
  );
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>7. Token Refresh (Optional)</h2>
            <p>Implement automatic token refresh before expiry:</p>
            <div className={styles.codeBlock}>
              <pre>
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
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Summary</h2>
            <ul>
              <li>✅ OAuth 2.0 Authorization Code Flow implemented</li>
              <li>✅ Secure token handling with HTTP-only cookies</li>
              <li>✅ CSRF protection with state parameter</li>
              <li>✅ App permission status handling (pending/approved/revoked)</li>
              <li>✅ Protected routes with automatic redirects</li>
              <li>✅ Token refresh capability</li>
            </ul>
            <div className={styles.alert}>
              <strong>🔗 Next Steps:</strong>
              <ul>
                <li>Review <a href="/docs/authentication">Authentication Flow</a> for detailed OAuth 2.0 explanation</li>
                <li>Check <a href="/docs/app-permissions">App Permissions</a> to understand permission lifecycle</li>
                <li>See <a href="/docs/api/endpoints">API Reference</a> for complete endpoint documentation</li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
