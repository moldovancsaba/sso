import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function VueExample() {
  return (
    \u003cDocsLayout\u003e
      \u003cdiv className={styles.container}\u003e
        \u003cheader className={styles.header}\u003e
          \u003ch1\u003eVue.js Integration Example\u003c/h1\u003e
        \u003c/header\u003e
        \u003cmain className={styles.main}\u003e
          \u003csection className={styles.section}\u003e
            \u003ch2\u003eInstallation\u003c/h2\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
                {`npm install @doneisbetter/sso-client`}
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003eAuth Store Setup\u003c/h2\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
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
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003eUsage Example\u003c/h2\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
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
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e
        \u003c/main\u003e
      \u003c/div\u003e
    \u003c/DocsLayout\u003e
  );
}
