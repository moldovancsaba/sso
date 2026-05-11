import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function ApiResponses() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>API Response Formats</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>OAuth Token Response</h2>
            <div className={styles.codeBlock}>
              <pre>{`{
  "access_token": "JWT_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "REFRESH_TOKEN",
  "id_token": "JWT_ID_TOKEN"
}`}</pre>
            </div>
            <p>
              <code>access_token</code> is used for API authorization. <code>id_token</code> carries identity claims.
              <code>refresh_token</code> is used to obtain a new access token without re-authentication.
            </p>
          </section>

          <section className={styles.section}>
            <h2>ID Token Claims</h2>
            <div className={styles.codeBlock}>
              <pre>{`{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "email_verified": true,
  "iss": "https://sso.doneisbetter.com",
  "aud": "YOUR_CLIENT_ID",
  "exp": 1234567890,
  "iat": 1234560000
}`}</pre>
            </div>
            <p>
              App-level permission state is not the same thing as public-user authentication state.
              If your app depends on per-app access or per-app role, also read the permission APIs.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Public Session Validation</h2>
            <div className={styles.codeBlock}>
              <pre>{`{
  "isValid": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "status": "active",
    "emailVerified": true,
    "loginMethods": ["password", "google"]
  }
}`}</pre>
            </div>
            <p>This is the response shape for <code>GET /api/public/session</code>.</p>
          </section>

          <section className={styles.section}>
            <h2>Registration Response</h2>
            <div className={styles.codeBlock}>
              <pre>{`{
  "success": true,
  "message": "Registration successful",
  "isAccountLinking": false,
  "loginMethods": ["password"],
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "createdAt": "2026-05-11T10:00:00.000Z"
  }
}`}</pre>
            </div>
            <p>If the email already belongs to a social-only account, the endpoint can return a successful password-linking response instead of creating a new record.</p>
          </section>

          <section className={styles.section}>
            <h2>Permission Record Response</h2>
            <div className={styles.codeBlock}>
              <pre>{`{
  "userId": "user-uuid",
  "clientId": "client-uuid",
  "appName": "Launchmass",
  "hasAccess": true,
  "status": "approved",
  "role": "admin",
  "requestedAt": "2026-05-11T10:00:00.000Z",
  "grantedAt": "2026-05-11T10:05:00.000Z",
  "grantedBy": "admin-uuid",
  "createdAt": "2026-05-11T10:00:00.000Z",
  "updatedAt": "2026-05-11T10:05:00.000Z"
}`}</pre>
            </div>
            <p>Canonical permission roles are <code>none</code>, <code>user</code>, <code>admin</code>. Canonical statuses are <code>pending</code>, <code>approved</code>, <code>revoked</code>.</p>
          </section>

          <section className={styles.section}>
            <h2>Access Request Response</h2>
            <div className={styles.codeBlock}>
              <pre>{`{
  "message": "Access request created",
  "permission": {
    "userId": "user-uuid",
    "clientId": "client-uuid",
    "appName": "Launchmass",
    "hasAccess": false,
    "status": "pending",
    "role": "none",
    "requestedAt": "2026-05-11T10:00:00.000Z"
  }
}`}</pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Error Shapes</h2>
            <p>OAuth endpoints use RFC-style errors:</p>
            <div className={styles.codeBlock}>
              <pre>{`{
  "error": "invalid_grant",
  "error_description": "Authorization code expired or invalid"
}`}</pre>
            </div>
            <p>Application endpoints usually use simple JSON error messages:</p>
            <div className={styles.codeBlock}>
              <pre>{`{
  "error": "Forbidden",
  "message": "Access token client does not match requested client"
}`}</pre>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
