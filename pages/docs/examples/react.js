import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function ReactExample() {
  return (
    \u003cDocsLayout\u003e
      \u003cdiv className={styles.container}\u003e
        \u003cheader className={styles.header}\u003e
          \u003ch1\u003eReact Integration Example\u003c/h1\u003e
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
            \u003ch2\u003eAuthContext Setup\u003c/h2\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
                {`// src/contexts/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { SSOClient } from '@doneisbetter/sso-client';

const AuthContext = createContext({});
const sso = new SSOClient('https://sso.doneisbetter.com');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await sso.validateSession();
      if (session.isValid) {
        setUser(session.user);
      }
    } catch (error) {
      console.error('Session validation failed:', error);
    }
    setLoading(false);
  };

  const login = async (username) => {
    const response = await sso.register({ username });
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    await sso.logout();
    setUser(null);
  };

  return (
    \u003cAuthContext.Provider value={{ user, loading, login, logout }}\u003e
      {children}
    \u003c/AuthContext.Provider\u003e
  );
}

export const useAuth = () => useContext(AuthContext);`}
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003eUsage Example\u003c/h2\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
                {`// src/App.js
import { AuthProvider, useAuth } from './contexts/AuthContext';

function LoginButton() {
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login('user@example.com');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return \u003cbutton onClick={handleLogin}\u003eSign In\u003c/button\u003e;
}

function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    \u003cdiv\u003e
      \u003ch2\u003eWelcome, {user.username}\u003c/h2\u003e
      \u003cbutton onClick={logout}\u003eSign Out\u003c/button\u003e
    \u003c/div\u003e
  );
}

export default function App() {
  return (
    \u003cAuthProvider\u003e
      \u003cLoginButton /\u003e
      \u003cUserProfile /\u003e
    \u003c/AuthProvider\u003e
  );
}`}
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e
        \u003c/main\u003e
      \u003c/div\u003e
    \u003c/DocsLayout\u003e
  );
}
