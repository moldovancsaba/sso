import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';

export default function Installation() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Installation Guide</h1>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Setup Instructions</h2>
            <p>Follow these steps to set up the project locally:</p>
            <ol>
              <li>
                <strong>Clone Repository:</strong>
                <code>git clone https://github.com/doneisbetter/session-spa.git</code>
              </li>
              <li>
                <strong>Navigate to Directory:</strong>
                <code>cd session-spa</code>
              </li>
              <li>
                <strong>Install Dependencies:</strong>
                <code>npm install</code>
              </li>
              <li>
                <strong>Set Environment Variables:</strong>
                <p>Create a <code>.env.local</code> file in the root directory and configure:</p>
                <pre>
{`NEXT_PUBLIC_API_URL=https://api.doneisbetter.com
SESSION_SECRET=mysecretkey
PORT=3000
`}
                </pre>
              </li>
              <li>
                <strong>Run Development Server:</strong>
                <code>npm run dev</code>
              </li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>System Requirements</h2>
            <p>Ensure you have the following prerequisites:</p>
            <ul>
              <li>Node.js v20.x</li>
              <li>npm v7.x or yarn v1.x</li>
              <li>Access to the internet for fetching dependencies</li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
