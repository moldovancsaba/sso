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
// WHAT: Vue.js OAuth 2.0 integration example with Pinia store
// WHY: Developers need copy-paste ready code for Vue 3 apps using SSO
// HOW: Provides Pinia store, composables, and protected route examples

export default function VueExample() {
  return (
    <PublicShell {...getDocsShellProps('/docs/examples/vue')}>
      <DocsPageShell
        eyebrow="Examples"
        lead="Reference Vue 3 integration using OAuth Authorization Code flow with backend token exchange."
        meta={createDocsVersionMeta('SSO Version')}
        title="Vue.js Integration Example"
      >
      <Stack gap="xl">
        <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              This guide demonstrates OAuth 2.0 Authorization Code Flow integration in a Vue 3 application
              using Composition API and Pinia for state management.
            </Text>
            <AccentPanel title="Security note" tone="red" variant="soft-outline">
              <Text size="sm">
                Never expose <code>client_secret</code> in your Vue app. All token exchange operations must happen on your backend server.
              </Text>
            </AccentPanel>
            <AccentPanel title="Current contract note" tone="amber" variant="soft-outline">
              <Text size="sm">
                Your backend session endpoint should derive app-permission state from the permission APIs and hand that result to Pinia. Do not assume canonical permission status comes directly from raw <code>id_token</code> claims.
              </Text>
            </AccentPanel>
        </Box>

          <Box>
            <Title order={2} mb="sm">1. Project Setup</Title>
            <Text size="sm">Install Pinia for state management:</Text>
            <Code block>
              {`npm install pinia
npm install vue-router # If not already installed`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">2. Environment Configuration</Title>
            <Text size="sm">Configure your environment variables:</Text>
            <Code block>
              {`# .env (Frontend - safe to expose CLIENT_ID only)
VITE_SSO_CLIENT_ID=your_client_id_here
VITE_SSO_BASE_URL=https://sso.doneisbetter.com

# .env (Backend - NEVER commit this file)
SSO_CLIENT_SECRET=your_client_secret_here
SSO_REDIRECT_URI=https://yourapp.com/api/auth/callback`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">3. Pinia Auth Store</Title>
            <Text size="sm">Create a Pinia store to manage authentication state:</Text>
            <Code block>
              {`// src/stores/auth.js
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: true,
    permission: null // e.g. { status: 'approved', role: 'member' }
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isApproved: (state) => state.permission?.status === 'approved',
    isPending: (state) => state.permission?.status === 'pending',
    isRevoked: (state) => state.permission?.status === 'revoked'
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
          this.permission = data.permission ?? null;
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
        this.permission = null;

        // Optional: Also logout from SSO
        window.location.href = import.meta.env.VITE_SSO_BASE_URL + '/api/public/logout';
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  }
});`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">4. Backend OAuth Callback (Express/Node.js)</Title>
            <Text size="sm">Handle the OAuth callback and exchange code for tokens:</Text>
            <Code block>
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

    // WHY: Decode ID token to get user identity claims
    const decoded = jwt.decode(id_token);
    const { sub: userId, email, name, role } = decoded;

    // WHY: Ask your backend permission layer for canonical app access state
    const permission = await getPermissionForUserAndClient({
      userId,
      clientId: process.env.SSO_CLIENT_ID
    });

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
});

// Session Validation Endpoint
router.get('/api/auth/session', (req, res) => {
  const { id_token, access_token } = req.cookies;

  if (!id_token || !access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.decode(id_token);
    const { sub: userId, email, name, role } = decoded;

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
});

// Logout Endpoint
router.post('/api/auth/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('id_token');
  res.json({ success: true });
});

export default router;`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">5. Auth Composable (Optional)</Title>
            <Text size="sm">Create a reusable composable for auth logic:</Text>
            <Code block>
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
  const permission = computed(() => authStore.permission);

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
    permission,
    login: () => authStore.login(),
    logout: () => authStore.logout(),
    requireAuth,
    requireApproval
  };
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">6. Router Guards</Title>
            <Text size="sm">Protect routes that require authentication:</Text>
            <Code block>
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
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">7. Component Examples</Title>
            <Code block>
              {`<!-- src/views/Login.vue -->
<template>
  <div class="login-page">
    <Title order={1} mb="xs">Sign In</Title>
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
    <Title order={1} mb="xs">Welcome, {{ user?.name }}</Title>
    <Text size="sm">Email: {{ user?.email }}</Text>
    <Text size="sm">Role: {{ user?.role }}</Text>
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
    <Title order={1} mb="xs">Access Pending</Title>
    <Text size="sm">
      Your access to this application is pending approval.
      An administrator will review your request shortly.
    </Text>
    <Text size="sm">You will receive an email notification once approved.</Text>
    <button @click="logout">Sign Out</button>
  </div>
</template>

<script setup>
import { useAuth } from '@/composables/useAuth';
const { logout } = useAuth();
</script>`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">8. App Setup</Title>
            <Text size="sm">Initialize Pinia and check session on app mount:</Text>
            <Code block>
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
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Summary</Title>
            <List spacing="xs">
              <List.Item>✅ OAuth 2.0 Authorization Code Flow with Vue 3 Composition API</List.Item>
              <List.Item>✅ Pinia store for centralized auth state management</List.Item>
              <List.Item>✅ Router guards for protected routes</List.Item>
              <List.Item>✅ Reusable auth composable</List.Item>
              <List.Item>✅ App permission status handling (pending/approved/revoked)</List.Item>
              <List.Item>✅ Secure token storage with HTTP-only cookies</List.Item>
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
