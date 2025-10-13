import styles from '../styles/docs.module.css';
import Link from 'next/link';

// WHAT: Public terms of service page for SSO service
// WHY: Legal agreement defining service usage terms; accessible without authentication
export default function TermsPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Terms of Service</h1>
        <p className={styles.version}>Last Updated: 2025-10-13T16:22:35.000Z</p>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using DoneIsBetter SSO ("the Service"), you agree to be bound by these Terms of Service 
            ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
          </p>
          <p>
            These Terms apply to all users of the Service, including individuals, organizations, and developers 
            integrating our SSO authentication into their applications.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Description of Service</h2>
          <p>
            DoneIsBetter SSO is a Single Sign-On (SSO) authentication service that provides:
          </p>
          <ul>
            <li>Centralized user authentication across multiple applications</li>
            <li>Session management and validation</li>
            <li>Secure password-based and passwordless (magic link) authentication</li>
            <li>Role-based access control and permissions management</li>
            <li>OAuth 2.0 compliant authorization flows</li>
            <li>API integration capabilities for third-party applications</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. User Accounts</h2>
          
          <h3>3.1 Account Registration</h3>
          <p>To use the Service, you must:</p>
          <ul>
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information</li>
            <li>Maintain the security and confidentiality of your password</li>
            <li>Be at least 18 years of age</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>

          <h3>3.2 Account Security</h3>
          <p>You are responsible for:</p>
          <ul>
            <li>All activities that occur under your account</li>
            <li>Maintaining the confidentiality of your authentication credentials</li>
            <li>Immediately notifying us of any unauthorized use of your account</li>
            <li>Ensuring your account is not shared with others</li>
          </ul>

          <h3>3.3 Account Termination</h3>
          <p>
            You may delete your account at any time via our <Link href="/data-deletion">data deletion page</Link>. 
            We reserve the right to suspend or terminate accounts that violate these Terms or engage in 
            fraudulent, abusive, or illegal activity.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Acceptable Use</h2>
          
          <h3>4.1 Permitted Use</h3>
          <p>You may use the Service for legitimate authentication and authorization purposes only.</p>

          <h3>4.2 Prohibited Activities</h3>
          <p>You may not:</p>
          <ul>
            <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
            <li>Use the Service to transmit malware, viruses, or malicious code</li>
            <li>Engage in activities that could damage, disable, or impair the Service</li>
            <li>Attempt to reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Use automated means (bots, scrapers) to access the Service without authorization</li>
            <li>Violate any applicable laws, regulations, or third-party rights</li>
            <li>Impersonate any person or entity or misrepresent your affiliation</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Share your authentication credentials with unauthorized parties</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. API Integration and Developer Terms</h2>
          
          <h3>5.1 API Usage</h3>
          <p>If you integrate our API into your application:</p>
          <ul>
            <li>You must comply with our <Link href="/docs/api">API Documentation</Link> and best practices</li>
            <li>You are responsible for properly handling user data received through our API</li>
            <li>You must implement proper error handling and security measures</li>
            <li>You must respect rate limits and usage restrictions</li>
          </ul>

          <h3>5.2 Domain Registration</h3>
          <p>
            Third-party applications must register their domains with us before integration. 
            Contact <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a> for domain registration.
          </p>

          <h3>5.3 OAuth Clients</h3>
          <p>
            OAuth client applications must be registered and approved by system administrators. 
            Unauthorized OAuth clients will be rejected by our CORS and authorization policies.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Privacy and Data Protection</h2>
          <p>
            Your privacy is important to us. Our collection, use, and protection of your personal information 
            is governed by our <Link href="/privacy">Privacy Policy</Link>, which is incorporated into these Terms by reference.
          </p>
          <p>Key points:</p>
          <ul>
            <li>We use industry-standard encryption and security measures</li>
            <li>Passwords are hashed using bcrypt before storage</li>
            <li>Session data is protected with HttpOnly cookies</li>
            <li>Authentication logs are retained for 90 days</li>
            <li>You can request account deletion at any time</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Intellectual Property</h2>
          
          <h3>7.1 Service Ownership</h3>
          <p>
            The Service, including all software, designs, graphics, and documentation, is owned by DoneIsBetter 
            and protected by copyright, trademark, and other intellectual property laws.
          </p>

          <h3>7.2 License Grant</h3>
          <p>
            We grant you a limited, non-exclusive, non-transferable license to use the Service in accordance 
            with these Terms. This license does not include the right to:
          </p>
          <ul>
            <li>Modify, copy, or create derivative works of the Service</li>
            <li>Sell, resell, or redistribute the Service</li>
            <li>Remove or alter any proprietary notices</li>
          </ul>

          <h3>7.3 Open Source</h3>
          <p>
            Our SSO client libraries are available under the MIT License. See our 
            <a href="https://github.com/moldovancsaba/sso" target="_blank" rel="noopener noreferrer"> GitHub repository</a> for details.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, 
            INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </p>
          <p>We do not warrant that:</p>
          <ul>
            <li>The Service will be uninterrupted, secure, or error-free</li>
            <li>The results obtained from the Service will be accurate or reliable</li>
            <li>Any errors or defects will be corrected</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, DONEISBETTER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR USE, ARISING OUT OF 
            OR RELATED TO THESE TERMS OR THE SERVICE.
          </p>
          <p>
            OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US (IF ANY) IN THE TWELVE (12) MONTHS 
            PRECEDING THE EVENT GIVING RISE TO LIABILITY.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless DoneIsBetter and its officers, directors, employees, 
            and agents from any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) 
            arising out of or related to:
          </p>
          <ul>
            <li>Your use or misuse of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Your integration or deployment of the Service in your applications</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>11. Service Modifications and Availability</h2>
          <p>We reserve the right to:</p>
          <ul>
            <li>Modify, suspend, or discontinue the Service at any time</li>
            <li>Change these Terms with notice to users</li>
            <li>Implement rate limits or usage restrictions</li>
            <li>Perform maintenance that may temporarily affect service availability</li>
          </ul>
          <p>
            We will make reasonable efforts to provide advance notice of significant changes or planned downtime.
          </p>
        </section>

        <section className={styles.section}>
          <h2>12. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable laws, without regard to 
            conflict of law principles.
          </p>
          <p>
            Any disputes arising out of or related to these Terms or the Service shall be resolved through binding 
            arbitration, except that either party may seek injunctive relief in court to prevent infringement of 
            intellectual property rights.
          </p>
        </section>

        <section className={styles.section}>
          <h2>13. Termination</h2>
          
          <h3>13.1 Termination by You</h3>
          <p>
            You may terminate your account at any time via our <Link href="/data-deletion">data deletion page</Link>.
          </p>

          <h3>13.2 Termination by Us</h3>
          <p>We may terminate or suspend your access immediately, without prior notice, if you:</p>
          <ul>
            <li>Violate these Terms</li>
            <li>Engage in fraudulent or illegal activity</li>
            <li>Pose a security risk to the Service or other users</li>
            <li>Fail to comply with applicable laws and regulations</li>
          </ul>

          <h3>13.3 Effect of Termination</h3>
          <p>Upon termination:</p>
          <ul>
            <li>Your right to use the Service immediately ceases</li>
            <li>Your data will be deleted in accordance with our <Link href="/privacy">Privacy Policy</Link></li>
            <li>Sections 7-12 of these Terms shall survive termination</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>14. Miscellaneous</h2>
          
          <h3>14.1 Entire Agreement</h3>
          <p>
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and 
            DoneIsBetter regarding the Service.
          </p>

          <h3>14.2 Severability</h3>
          <p>
            If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain 
            in full force and effect.
          </p>

          <h3>14.3 Waiver</h3>
          <p>
            Our failure to enforce any provision of these Terms shall not constitute a waiver of that provision 
            or our right to enforce it in the future.
          </p>

          <h3>14.4 Assignment</h3>
          <p>
            You may not assign or transfer these Terms without our prior written consent. We may assign these 
            Terms without restriction.
          </p>

          <h3>14.5 Changes to Terms</h3>
          <p>
            We may update these Terms from time to time. Continued use of the Service after changes constitutes 
            acceptance of the updated Terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>15. Contact Information</h2>
          <p>If you have questions about these Terms, please contact us:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a></li>
            <li><strong>Website:</strong> <a href="https://sso.doneisbetter.com">https://sso.doneisbetter.com</a></li>
            <li><strong>Documentation:</strong> <Link href="/docs">API Documentation</Link></li>
            <li><strong>GitHub:</strong> <a href="https://github.com/moldovancsaba/sso" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
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
