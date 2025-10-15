// WHAT: Vue.js OAuth 2.0 integration example with Pinia store
// WHY: Developers need copy-paste ready code for Vue 3 apps using SSO
// HOW: Provides Pinia store, composables, and protected route examples

import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function VueExample() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Vue.js Integration Example</h1>
          <p className={styles.version}>SSO Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              This guide demonstrates OAuth 2.0 Authorization Code Flow integration in a Vue 3 application
              using Composition API and Pinia for state management.
            </p>
            <div className={styles.alert}>
              <strong>⚠️ Security Note:</strong> Never expose <code>client_secret</code> in your Vue app.
              All token exchange operations must happen on your backend server.
            </div>
          </section>

          <section className={styles.section}>
            <h2>1. Project Setup</h2>
            <p>Install Pinia for state management:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`npm install pinia
npm install vue-router # If not already installed`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>2. Environment Configuration</h2>
            <p>Configure your environment variables:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`# .env (Frontend - safe to expose CLIENT_ID only)
VITE_SSO_CLIENT_ID=your_client_id_here
VITE_SSO_BASE_URL=https://sso.doneisbetter.com

# .env (Backend - NEVER commit this file)
SSO_CLIENT_SECRET=your_client_secret_here
SSO_REDIRECT_URI=https://yourapp.com/api/auth/callback`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>3. Pinia Auth Store</h2>
            <p>Create a Pinia store to manage authentication state:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// src/stores/auth.js
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: true,
    permissionStatus: null // 'approved', 'pending', 'revoked'
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isApproved: (state) => state.permissionStatus === 'approved',
    isPending: (state) => state.permissionStatus === 'pending',
    isRevoked: (state) => state.permissionStatus === 'revoked'
  },

  actions: {
    // WHY: Check if user has a valid session with your backend
    async checkSession() {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include' // Include cookies
        });

        if (response.ok) {
          const data = await response.json();
          this.user = data.user;
          this.permissionStatus = data.permissionStatus;
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        this.loading = false;
      }
    },

    // WHY: Redirect user to SSO authorization page
    login() {
      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem('oauth_state', state);

      const authUrl = new URL(import.meta.env.VITE_SSO_BASE_URL + '/api/oauth/authorize');
      authUrl.searchParams.append('client_id', import.meta.env.VITE_SSO_CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', window.location.origin + '/api/auth/callback');
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', 'openid profile email');
      authUrl.searchParams.append('state', state);

      window.location.href = authUrl.toString();
    },

    // WHY: Clear session and redirect to SSO logout
    async logout() {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
        this.user = null;
        this.permissionStatus = null;

        // Optional: Also logout from SSO
        window.location.href = import.meta.env.VITE_SSO_BASE_URL + '/api/public/logout';
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  }
});`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>4. Backend OAuth Callback (Express/Node.js)</h2>
            <p>Handle the OAuth callback and exchange code for tokens:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// server/routes/auth.js (Express example)
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// OAuth Callback Endpoint
router.get('/api/auth/callback', async (req, res) => {
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
          client_secret: process.env.SSO_CLIENT_SECRET
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
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 3600000 // 1 hour
    });
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 2592000000 // 30 days
    });
    res.cookie('id_token', id_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 3600000
    });

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
});

// Session Validation Endpoint
router.get('/api/auth/session', (req, res) => {
  const { id_token, access_token } = req.cookies;

  if (!id_token || !access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.decode(id_token);
    const { sub: userId, email, name, role, permissionStatus } = decoded;

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
});

// Logout Endpoint
router.post('/api/auth/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('id_token');
  res.json({ success: true });
});

export default router;`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>5. Auth Composable (Optional)</h2>
            <p>Create a reusable composable for auth logic:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// src/composables/useAuth.js
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

export function useAuth() {
  const authStore = useAuthStore();
  const router = useRouter();

  const user = computed(() => authStore.user);
  const loading = computed(() => authStore.loading);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isApproved = computed(() => authStore.isApproved);
  const permissionStatus = computed(() => authStore.permissionStatus);

  const requireAuth = () => {
    if (!isAuthenticated.value) {
      router.push('/login');
      return false;
    }
    return true;
  };

  const requireApproval = () => {
    if (!requireAuth()) return false;

    if (!isApproved.value) {
      if (authStore.isPending) {
        router.push('/access-pending');
      } else if (authStore.isRevoked) {
        router.push('/access-denied');
      }
      return false;
    }
    return true;
  };

  return {
    user,
    loading,
    isAuthenticated,
    isApproved,
    permissionStatus,
    login: () => authStore.login(),
    logout: () => authStore.logout(),
    requireAuth,
    requireApproval
  };
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>6. Router Guards</h2>
            <p>Protect routes that require authentication:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true, requiresApproval: true }
  },
  {
    path: '/access-pending',
    name: 'AccessPending',
    component: () => import('@/views/AccessPending.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/access-denied',
    name: 'AccessDenied',
    component: () => import('@/views/AccessDenied.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// WHY: Global navigation guard to check authentication and permissions
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // WHY: Wait for session check to complete
  if (authStore.loading) {
    await authStore.checkSession();
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresApproval = to.matched.some(record => record.meta.requiresApproval);

  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (requiresApproval && !authStore.isApproved) {
    if (authStore.isPending) {
      next('/access-pending');
    } else if (authStore.isRevoked) {
      next('/access-denied');
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>7. Component Examples</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`<!-- src/views/Login.vue -->
<template>
  <div class="login-page">
    <h1>Sign In</h1>
    <button @click="handleLogin" :disabled="loading">
      {{ loading ? 'Loading...' : 'Sign in with SSO' }}
    </button>
  </div>
</template>

<script setup>
import { useAuth } from '@/composables/useAuth';

const { login, loading } = useAuth();

const handleLogin = () => {
  login();
};
</script>

<!-- src/views/Dashboard.vue -->
<template>
  <div class="dashboard">
    <h1>Welcome, {{ user?.name }}</h1>
    <p>Email: {{ user?.email }}</p>
    <p>Role: {{ user?.role }}</p>
    <button @click="handleLogout">Sign Out</button>
  </div>
</template>

<script setup>
import { useAuth } from '@/composables/useAuth';
import { onMounted } from 'vue';

const { user, logout, requireApproval } = useAuth();

onMounted(() => {
  // WHY: Ensure user is approved before showing dashboard
  requireApproval();
});

const handleLogout = () => {
  logout();
};
</script>

<!-- src/views/AccessPending.vue -->
<template>
  <div class="access-pending">
    <h1>Access Pending</h1>
    <p>
      Your access to this application is pending approval.
      An administrator will review your request shortly.
    </p>
    <p>You will receive an email notification once approved.</p>
    <button @click="logout">Sign Out</button>
  </div>
</template>

<script setup>
import { useAuth } from '@/composables/useAuth';
const { logout } = useAuth();
</script>`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>8. App Setup</h2>
            <p>Initialize Pinia and check session on app mount:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// WHY: Check session on app initialization
const authStore = useAuthStore();
authStore.checkSession();

app.mount('#app');`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Summary</h2>
            <ul>
              <li>✅ OAuth 2.0 Authorization Code Flow with Vue 3 Composition API</li>
              <li>✅ Pinia store for centralized auth state management</li>
              <li>✅ Router guards for protected routes</li>
              <li>✅ Reusable auth composable</li>
              <li>✅ App permission status handling (pending/approved/revoked)</li>
              <li>✅ Secure token storage with HTTP-only cookies</li>
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
