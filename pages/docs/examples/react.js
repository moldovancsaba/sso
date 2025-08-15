import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function ReactExample() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>React Integration Example</h1>
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
            <h2>AuthContext Setup</h2>
            <div className={styles.codeBlock}>
              <pre>
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
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Usage Example</h2>
            <div className={styles.codeBlock}>
              <pre>
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

  return <button onClick={handleLogin}>Sign In</button>;
}

function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div>
      <h2>Welcome, {user.username}</h2>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LoginButton />
      <UserProfile />
    </AuthProvider>
  );
}`}
              </pre>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
