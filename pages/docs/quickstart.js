import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';

export default function Quickstart() {
  return (
    \u003cDocsLayout\u003e
      \u003cdiv className={styles.container}\u003e
        \u003cheader className={styles.header}\u003e
          \u003ch1\u003eQuick Start Guide\u003c/h1\u003e
        \u003c/header\u003e
        \u003cmain className={styles.main}\u003e
          \u003csection className={styles.section}\u003e
            \u003ch2\u003e1. Installation\u003c/h2\u003e
            \u003cp\u003e
              Install the SSO client library using npm or yarn:
            \u003c/p\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
                {`npm install @doneisbetter/sso-client

# or using yarn
yarn add @doneisbetter/sso-client`}
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003e2. Initialize the Client\u003c/h2\u003e
            \u003cp\u003e
              Create an instance of the SSO client:
            \u003c/p\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
                {`import { SSOClient } from '@doneisbetter/sso-client';

const sso = new SSOClient('https://sso.doneisbetter.com');`}
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003e3. Implement Authentication\u003c/h2\u003e
            \u003cp\u003e
              Add login functionality to your application:
            \u003c/p\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
                {`// Register/login a user
const response = await sso.register({
  username: 'user@example.com'
});

// Check session status
const session = await sso.validateSession();
if (session.isValid) {
  console.log('User:', session.user);
}

// Logout
await sso.logout();`}
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003e4. Handle Errors\u003c/h2\u003e
            \u003cp\u003e
              Implement proper error handling:
            \u003c/p\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
                {`try {
  const session = await sso.validateSession();
  if (session.isValid) {
    // User is authenticated
  }
} catch (error) {
  if (error.code === 'SESSION_EXPIRED') {
    // Redirect to login
  } else {
    // Handle other errors
  }
}`}
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003e5. Next Steps\u003c/h2\u003e
            \u003cp\u003e
              For more detailed information, check out these guides:
            \u003c/p\u003e
            \u003cul\u003e
              \u003cli\u003e\u003ca href="/docs/api"\u003eAPI Reference\u003c/a\u003e\u003c/li\u003e
              \u003cli\u003e\u003ca href="/docs/error-handling"\u003eError Handling Guide\u003c/a\u003e\u003c/li\u003e
              \u003cli\u003e\u003ca href="/docs/session-management"\u003eSession Management\u003c/a\u003e\u003c/li\u003e
              \u003cli\u003e\u003ca href="/docs/security/best-practices"\u003eSecurity Best Practices\u003c/a\u003e\u003c/li\u003e
            \u003c/ul\u003e
          \u003c/section\u003e
        \u003c/main\u003e
      \u003c/div\u003e
    \u003c/DocsLayout\u003e
  );
}
