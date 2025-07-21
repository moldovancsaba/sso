import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function VanillaExample() {
  return (
    \u003cDocsLayout\u003e
      \u003cdiv className={styles.container}\u003e
        \u003cheader className={styles.header}\u003e
          \u003ch1\u003eVanilla JavaScript Integration Example\u003c/h1\u003e
        \u003c/header\u003e
        \u003cmain className={styles.main}\u003e
          \u003csection className={styles.section}\u003e
            \u003ch2\u003eInstallation\u003c/h2\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
                {`npm install @doneisbetter/sso-client

// Or via CDN
<script src="https://cdn.doneisbetter.com/sso-client/v1.0.0/index.min.js"></script>`}
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003eInitialization\u003c/h2\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
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
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003eComplete Example\u003c/h2\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
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
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e
        \u003c/main\u003e
      \u003c/div\u003e
    \u003c/DocsLayout\u003e
  );
}
