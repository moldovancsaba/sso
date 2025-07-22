import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function SecurityPermissions() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Permissions System</h1>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              The SSO service uses a role-based access control (RBAC) system to manage user permissions.
              Learn how to implement and manage permissions in your integration.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Permission Types</h2>
            <ul>
              <li><code>isAdmin</code> - Full system access</li>
              <li><code>canViewUsers</code> - Can view user list</li>
              <li><code>canManageUsers</code> - Can modify user data</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Implementation Example</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`// Check user permissions
const session = await sso.validateSession();
if (session.isValid) {
  const { permissions } = session.user;
  
  if (permissions.isAdmin) {
    // Show admin features
  }
  
  if (permissions.canManageUsers) {
    // Show user management features
  }
}`}
              </pre>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
