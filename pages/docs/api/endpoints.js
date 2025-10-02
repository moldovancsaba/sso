import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function ApiEndpoints() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>API Endpoints Reference</h1>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Authentication Endpoints</h2>
            
            <h3>Register User</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}`}
              </pre>
            </div>

            <h3>User Login</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}`}
              </pre>
            </div>

            <h3>User Logout</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`POST /api/users/logout
Authorization: Bearer {{session_token}}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Session Management</h2>
            
            <h3>Validate Session</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`GET /api/sso/validate
Authorization: Bearer {{session_token}}`}
              </pre>
            </div>

            <h3>Get Session Status</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`GET /api/users/session-status
Authorization: Bearer {{session_token}}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>User Management</h2>
            
            <h3>Get User Profile</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`GET /api/users/{{userId}}
Authorization: Bearer {{session_token}}`}
              </pre>
            </div>

            <h3>Update User Profile</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`PATCH /api/users/{{userId}}
Authorization: Bearer {{session_token}}
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "newemail@example.com"
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>API Rate Limits</h2>
            <p>
              API endpoints are subject to rate limiting to ensure service stability.
              Current limits are:
            </p>
            <ul>
              <li>Authentication endpoints: 10 requests per minute</li>
              <li>Session validation: 60 requests per minute</li>
              <li>User profile operations: 30 requests per minute</li>
            </ul>
            <p>
              Rate limit status is returned in response headers:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`X-Rate-Limit-Limit: 60
X-Rate-Limit-Remaining: 58
X-Rate-Limit-Reset: "2025-07-22T06:36:38Z"`}
              </pre>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
