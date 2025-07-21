import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function SecurityPermissions() {
  return (
    \u003cDocsLayout\u003e
      \u003cdiv className={styles.container}\u003e
        \u003cheader className={styles.header}\u003e
          \u003ch1\u003ePermissions System\u003c/h1\u003e
        \u003c/header\u003e
        \u003cmain className={styles.main}\u003e
          \u003csection className={styles.section}\u003e
            \u003ch2\u003eOverview\u003c/h2\u003e
            \u003cp\u003e
              The SSO service uses a role-based access control (RBAC) system to manage user permissions.
              Learn how to implement and manage permissions in your integration.
            \u003c/p\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003ePermission Types\u003c/h2\u003e
            \u003cul\u003e
              \u003cli\u003e\u003ccode\u003eisAdmin\u003c/code\u003e - Full system access\u003c/li\u003e
              \u003cli\u003e\u003ccode\u003ecanViewUsers\u003c/code\u003e - Can view user list\u003c/li\u003e
              \u003cli\u003e\u003ccode\u003ecanManageUsers\u003c/code\u003e - Can modify user data\u003c/li\u003e
            \u003c/ul\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003eImplementation Example\u003c/h2\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
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
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e
        \u003c/main\u003e
      \u003c/div\u003e
    \u003c/DocsLayout\u003e
  );
}
