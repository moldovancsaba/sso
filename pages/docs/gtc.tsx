import Layout from '../../components/Layout';

export default function GTC() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-5 sm:p-6 prose max-w-none">
              <h1>General Terms and Conditions</h1>
              
              <p className="text-sm text-gray-500">Last updated: 2025-07-05</p>

              <h2>1. Introduction</h2>
              <p>
                These General Terms and Conditions ("Terms") govern your use of the SSO service
                ("Service") provided by Done is Better ("Company", "we", "our", or "us").
              </p>

              <h2>2. Service Description</h2>
              <p>
                The Service provides single sign-on authentication capabilities for applications
                and services. It allows users to authenticate using identifiers and manages
                secure access tokens.
              </p>

              <h2>3. User Obligations</h2>
              <ul>
                <li>You must provide accurate information when using the Service</li>
                <li>You are responsible for maintaining the security of your credentials</li>
                <li>You must not attempt to circumvent any security measures</li>
                <li>You must comply with all applicable laws and regulations</li>
              </ul>

              <h2>4. API Usage</h2>
              <p>
                Use of our API is subject to rate limiting and fair usage policies. API keys
                must be kept secure and not shared with unauthorized parties.
              </p>

              <h2>5. Data Processing</h2>
              <p>
                We process minimal data necessary for service operation. All processing
                complies with our Privacy Policy and applicable data protection laws.
              </p>

              <h2>6. Service Availability</h2>
              <p>
                While we strive for high availability, we do not guarantee uninterrupted
                service. We reserve the right to modify or temporarily suspend the service
                for maintenance or updates.
              </p>

              <h2>7. Security</h2>
              <p>
                We implement industry-standard security measures but cannot guarantee
                absolute security. Users must implement appropriate security measures
                in their applications.
              </p>

              <h2>8. Liability</h2>
              <p>
                Our liability is limited to the extent permitted by law. We are not
                liable for indirect damages or loss of data.
              </p>

              <h2>9. Changes to Terms</h2>
              <p>
                We may modify these terms at any time. Continued use of the service
                constitutes acceptance of modified terms.
              </p>

              <h2>10. Termination</h2>
              <p>
                We reserve the right to terminate service access for violations of
                these terms or for any other reason at our discretion.
              </p>

              <h2>11. Governing Law</h2>
              <p>
                These terms are governed by the laws of the jurisdiction where the
                Company is registered.
              </p>

              <h2>Contact</h2>
              <p>
                For questions about these terms, contact us at legal@doneisbetter.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
