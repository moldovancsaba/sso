import styles from '../styles/docs.module.css';
import Link from 'next/link';

// WHAT: Public privacy policy page for SSO service
// WHY: Required for transparency and legal compliance; accessible without authentication
export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Privacy Policy</h1>
        <p className={styles.version}>Last Updated: 2025-10-13T16:22:35.000Z</p>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2>Introduction</h2>
          <p>
            DoneIsBetter SSO ("we", "our", or "us") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
            when you use our Single Sign-On (SSO) authentication service.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Information We Collect</h2>
          
          <h3>Personal Information</h3>
          <p>We collect the following information when you register or use our service:</p>
          <ul>
            <li><strong>Email Address</strong> - Required for account creation and authentication</li>
            <li><strong>Password</strong> - Stored using industry-standard bcrypt hashing</li>
            <li><strong>Username</strong> - Optional display name</li>
            <li><strong>Session Data</strong> - Authentication tokens and session identifiers</li>
          </ul>

          <h3>Automatically Collected Information</h3>
          <p>When you use our service, we automatically collect:</p>
          <ul>
            <li><strong>IP Address</strong> - For security monitoring and fraud prevention</li>
            <li><strong>User Agent</strong> - Browser and device information</li>
            <li><strong>Authentication Logs</strong> - Login attempts, timestamps, and success/failure status</li>
            <li><strong>Session Activity</strong> - Session creation, validation, and expiration events</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>How We Use Your Information</h2>
          <p>We use the collected information for the following purposes:</p>
          <ul>
            <li><strong>Authentication</strong> - To verify your identity and maintain secure sessions</li>
            <li><strong>Service Delivery</strong> - To provide SSO functionality across integrated applications</li>
            <li><strong>Security</strong> - To detect and prevent unauthorized access, fraud, and abuse</li>
            <li><strong>Account Management</strong> - To manage your account, process password resets, and handle support requests</li>
            <li><strong>Communication</strong> - To send authentication-related emails (magic links, password reset, PIN verification)</li>
            <li><strong>Compliance</strong> - To comply with legal obligations and enforce our terms of service</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Data Storage and Security</h2>
          
          <h3>Data Storage</h3>
          <p>Your data is stored in MongoDB databases with the following protections:</p>
          <ul>
            <li>Production and development environments use the same secure database infrastructure</li>
            <li>All connections use encrypted channels (SSL/TLS)</li>
            <li>Passwords are hashed using bcrypt with salt rounds before storage</li>
            <li>Session tokens are securely generated and stored with HttpOnly cookies</li>
          </ul>

          <h3>Security Measures</h3>
          <p>We implement industry-standard security practices:</p>
          <ul>
            <li><strong>Encryption</strong> - HTTPS/TLS for all data in transit</li>
            <li><strong>Authentication</strong> - Multi-factor authentication options (PIN verification, magic links)</li>
            <li><strong>Session Management</strong> - Automatic session expiration and validation</li>
            <li><strong>Access Controls</strong> - Role-based permissions and audit logging</li>
            <li><strong>Rate Limiting</strong> - Protection against brute force attacks</li>
            <li><strong>CORS Policies</strong> - Strict cross-origin resource sharing controls</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Data Sharing and Disclosure</h2>
          
          <h3>Third-Party Services</h3>
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>Vercel</strong> - Hosting and deployment infrastructure</li>
            <li><strong>MongoDB Atlas</strong> - Database hosting and management</li>
            <li><strong>Email Service Provider</strong> - For sending authentication emails (Resend/Nodemailer)</li>
          </ul>

          <h3>Integrated Applications</h3>
          <p>
            When you authenticate through our SSO service, we share limited information with integrated applications:
          </p>
          <ul>
            <li>User ID (unique identifier)</li>
            <li>Email address</li>
            <li>Username (if provided)</li>
            <li>Permission levels (admin status, role-based access)</li>
          </ul>

          <h3>Legal Requirements</h3>
          <p>We may disclose your information if required by law, court order, or government regulation.</p>
        </section>

        <section className={styles.section}>
          <h2>Your Rights and Choices</h2>
          <p>You have the following rights regarding your personal information:</p>
          <ul>
            <li><strong>Access</strong> - Request access to your personal data through your account page</li>
            <li><strong>Correction</strong> - Update your email, username, or password at any time</li>
            <li><strong>Deletion</strong> - Request account deletion via our <Link href="/data-deletion">data deletion page</Link></li>
            <li><strong>Export</strong> - Request a copy of your data (contact support@doneisbetter.com)</li>
            <li><strong>Opt-Out</strong> - Manage email notification preferences in your account settings</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Data Retention</h2>
          <p>We retain your information as follows:</p>
          <ul>
            <li><strong>Active Accounts</strong> - Data retained indefinitely while account is active</li>
            <li><strong>Deleted Accounts</strong> - Data permanently deleted within 30 days of deletion request</li>
            <li><strong>Authentication Logs</strong> - Retained for 90 days for security and audit purposes</li>
            <li><strong>Session Data</strong> - Automatically deleted upon session expiration</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Cookies and Tracking</h2>
          <p>We use cookies for the following purposes:</p>
          <ul>
            <li><strong>Authentication Cookies</strong> - HttpOnly cookies with domain <code>.doneisbetter.com</code></li>
            <li><strong>Session Management</strong> - To maintain your logged-in state across integrated applications</li>
            <li><strong>Security</strong> - To prevent cross-site request forgery (CSRF) attacks</li>
          </ul>
          <p>
            Our cookies are essential for service functionality. Disabling cookies will prevent authentication.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Children's Privacy</h2>
          <p>
            Our service is not intended for users under 18 years of age. We do not knowingly collect 
            personal information from children. If you believe we have collected information from a child, 
            please contact us immediately.
          </p>
        </section>

        <section className={styles.section}>
          <h2>International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of residence. 
            We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
            the new Privacy Policy on this page and updating the "Last Updated" date.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact Us</h2>
          <p>If you have questions about this Privacy Policy or our data practices, please contact us:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a></li>
            <li><strong>Website:</strong> <a href="https://sso.doneisbetter.com">https://sso.doneisbetter.com</a></li>
            <li><strong>Documentation:</strong> <Link href="/docs">API Documentation</Link></li>
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© 2025 DoneIsBetter. All rights reserved.</p>
        <div style={{ marginTop: '1rem' }}>
          <Link href="/">Home</Link> | 
          <Link href="/privacy" style={{ margin: '0 0.5rem' }}>Privacy Policy</Link> | 
          <Link href="/terms" style={{ margin: '0 0.5rem' }}>Terms of Service</Link> | 
          <Link href="/data-deletion">Data Deletion</Link>
        </div>
      </footer>
    </div>
  );
}
