import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function SecurityBestPractices() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Security Best Practices</h1>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              Implementing robust security measures is crucial for protecting your SSO integration.
              Follow these best practices to ensure secure authentication and data handling.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Session Management</h2>
            <ul>
              <li>Implement session timeouts</li>
              <li>Use secure session storage</li>
              <li>Regularly rotate session tokens</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Data Protection</h2>
            <ul>
              <li>Use HTTPS for all communications</li>
              <li>Implement proper data encryption</li>
              <li>Secure storage of sensitive information</li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
