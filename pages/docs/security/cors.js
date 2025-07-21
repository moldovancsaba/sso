import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function SecurityCORS() {
  return (
    \u003cDocsLayout\u003e
      \u003cdiv className={styles.container}\u003e
        \u003cheader className={styles.header}\u003e
          \u003ch1\u003eCORS Configuration\u003c/h1\u003e
        \u003c/header\u003e
        \u003cmain className={styles.main}\u003e
          \u003csection className={styles.section}\u003e
            \u003ch2\u003eOverview\u003c/h2\u003e
            \u003cp\u003e
              Cross-Origin Resource Sharing (CORS) is essential for secure client-server communication.
              Learn how to properly configure CORS for your SSO integration.
            \u003c/p\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003eAllowed Origins\u003c/h2\u003e
            \u003cp\u003e
              You must register your domain with our service to enable cross-origin requests.
              Contact support to add your domain to the allowed origins list.
            \u003c/p\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003eHeaders Configuration\u003c/h2\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
                {`// Required Headers
Origin: your-domain.com
Content-Type: application/json

// CORS Headers in Response
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: your-domain.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization`}
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e
        \u003c/main\u003e
      \u003c/div\u003e
    \u003c/DocsLayout\u003e
  );
}
