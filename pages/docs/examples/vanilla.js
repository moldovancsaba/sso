import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function VanillaExample() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Vanilla JavaScript Integration Example</h1>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Installation</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`npm install @doneisbetter/sso-client

// Or via CDN
<script src="https://cdn.doneisbetter.com/sso-client/v1.0.0/index.min.js"></script>`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Initialization</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`// Initialize the SSO client
const sso = new SSOClient('https://sso.doneisbetter.com');

// Check current session on page load
async function checkSession() {
  try {
    const session = await sso.validateSession();
    if (session.isValid) {
      showUserProfile(session.user);
    } else {
      showLoginForm();
    }
  } catch (error) {
    console.error('Session validation failed:', error);
    showLoginForm();
  }
}

document.addEventListener('DOMContentLoaded', checkSession);`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Complete Example</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`<!DOCTYPE html>
<html>
<head>
  <title>SSO Integration Example</title>
  <script src="https://cdn.doneisbetter.com/sso-client/v1.0.0/index.min.js"></script>
</head>
<body>
  <div id="app">
    <div id="login-form" style="display: none;">
      <input type="email" id="username" placeholder="Email">
      <button onclick="handleLogin()">Sign In</button>
    </div>
    
    <div id="user-profile" style="display: none;">
      <h2 id="welcome-message"></h2>
      <button onclick="handleLogout()">Sign Out</button>
    </div>
  </div>

  <script>
    const sso = new SSOClient('https://sso.doneisbetter.com');
    
    function showLoginForm() {
      document.getElementById('login-form').style.display = 'block';
      document.getElementById('user-profile').style.display = 'none';
    }
    
    function showUserProfile(user) {
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('user-profile').style.display = 'block';
      document.getElementById('welcome-message').textContent = 
        \`Welcome, \${user.username}\`;
    }
    
    async function checkSession() {
      try {
        const session = await sso.validateSession();
        if (session.isValid) {
          showUserProfile(session.user);
        } else {
          showLoginForm();
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        showLoginForm();
      }
    }
    
    async function handleLogin() {
      const username = document.getElementById('username').value;
      try {
        const response = await sso.register({ username });
        showUserProfile(response.user);
      } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
      }
    }
    
    async function handleLogout() {
      try {
        await sso.logout();
        showLoginForm();
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
    
    document.addEventListener('DOMContentLoaded', checkSession);
  </script>
</body>
</html>`}
              </pre>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
