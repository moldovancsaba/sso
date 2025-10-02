import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function VueExample() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Vue.js Integration Example</h1>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Installation</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`npm install @doneisbetter/sso-client`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Auth Store Setup</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`// src/stores/auth.js
import { defineStore } from 'pinia';
import { SSOClient } from '@doneisbetter/sso-client';

const sso = new SSOClient('https://sso.doneisbetter.com');

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: true
  }),

  actions: {
    async checkSession() {
      try {
        const session = await sso.validateSession();
        if (session.isValid) {
          this.user = session.user;
        }
      } catch (error) {
        console.error('Session validation failed:', error);
      }
      this.loading = false;
    },

    async login(username) {
      const response = await sso.register({ username });
      this.user = response.user;
      return response;
    },

    async logout() {
      await sso.logout();
      this.user = null;
    }
  }
});`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Usage Example</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`<!-- src/App.vue -->
<template>
  <div v-if="!authStore.loading">
    <div v-if="!authStore.user">
      <button @click="handleLogin">Sign In</button>
    </div>
    <div v-else>
      <h2>Welcome, {{ authStore.user.username }}</h2>
      <button @click="authStore.logout">Sign Out</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();

onMounted(() => {
  authStore.checkSession();
});

const handleLogin = async () => {
  try {
    await authStore.login('user@example.com');
  } catch (error) {
    console.error('Login failed:', error);
  }
};
</script>`}
              </pre>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
