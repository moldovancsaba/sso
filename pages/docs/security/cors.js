import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function SecurityCORS() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>CORS Configuration</h1>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              Cross-Origin Resource Sharing (CORS) is essential for secure client-server communication.
              Learn how to properly configure CORS for your SSO integration.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Allowed Origins</h2>
            <p>
              You must register your domain with our service to enable cross-origin requests.
              Contact support to add your domain to the allowed origins list.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Headers Configuration</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`// Required Headers
Origin: your-domain.com
Content-Type: application/json

// CORS Headers in Response
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: your-domain.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization`}
              </pre>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
