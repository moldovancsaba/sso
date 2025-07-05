import Layout from '../../components/Layout';

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-5 sm:p-6 prose max-w-none">
              <h1>Privacy Policy</h1>
              
              <p className="text-sm text-gray-500">Last updated: 2025-07-05</p>

              <h2>1. Introduction</h2>
              <p>
                This Privacy Policy explains how Done is Better ("we", "our", or "us")
                collects, uses, and protects your information when you use our SSO service.
              </p>

              <h2>2. Information We Collect</h2>
              <h3>2.1 Essential Information</h3>
              <ul>
                <li>User identifiers (provided during authentication)</li>
                <li>Authentication timestamps</li>
                <li>API usage data</li>
              </ul>

              <h3>2.2 Technical Data</h3>
              <ul>
                <li>IP addresses</li>
                <li>Browser type and version</li>
                <li>Access timestamps</li>
                <li>Authentication patterns</li>
              </ul>

              <h2>3. How We Use Your Information</h2>
              <p>We use collected information for:</p>
              <ul>
                <li>Providing authentication services</li>
                <li>Maintaining service security</li>
                <li>Preventing fraud and abuse</li>
                <li>Improving service performance</li>
              </ul>

              <h2>4. Data Retention</h2>
              <p>
                We retain data only as long as necessary for service operation:
              </p>
              <ul>
                <li>Authentication tokens: 10 minutes</li>
                <li>Access logs: 30 days</li>
                <li>Technical data: 90 days</li>
              </ul>

              <h2>5. Data Sharing</h2>
              <p>
                We do not share your data with third parties except:
              </p>
              <ul>
                <li>When required by law</li>
                <li>To protect our rights</li>
                <li>With your explicit consent</li>
              </ul>

              <h2>6. Security Measures</h2>
              <p>
                We implement industry-standard security measures:
              </p>
              <ul>
                <li>Encryption in transit and at rest</li>
                <li>Regular security audits</li>
                <li>Access controls and monitoring</li>
                <li>Secure data deletion practices</li>
              </ul>

              <h2>7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access your data</li>
                <li>Request data deletion</li>
                <li>Object to data processing</li>
                <li>Receive data in portable format</li>
              </ul>

              <h2>8. Cookies and Tracking</h2>
              <p>
                We use only essential cookies required for authentication. No tracking
                or marketing cookies are used.
              </p>

              <h2>9. Children's Privacy</h2>
              <p>
                Our service is not intended for users under 13 years of age. We do not
                knowingly collect data from children.
              </p>

              <h2>10. Changes to Policy</h2>
              <p>
                We may update this policy periodically. Users will be notified of
                significant changes.
              </p>

              <h2>11. Contact Information</h2>
              <p>
                For privacy-related inquiries, contact us at:
                privacy@doneisbetter.com
              </p>

              <h2>12. Legal Basis</h2>
              <p>
                We process data based on:
              </p>
              <ul>
                <li>Contract fulfillment</li>
                <li>Legal obligations</li>
                <li>Legitimate interests</li>
                <li>User consent</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
