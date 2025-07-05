import Layout from '../../components/Layout';

export default function Integration() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Integration Guide</h1>
              
              <div className="prose max-w-none">
                <h2>Quick Start</h2>
                <p>Follow these steps to integrate SSO into your application:</p>
                
                <h3>1. Install the Client Library</h3>
                <pre className="bg-gray-100 p-4 rounded-md">
                  npm install @doneisbetter/sso-client
                </pre>

                <h3>2. Initialize the Client</h3>
                <pre className="bg-gray-100 p-4 rounded-md">
                  {`import { SSOClient } from '@doneisbetter/sso-client';

const sso = new SSOClient({
  apiKey: 'your-api-key'
});`}
                </pre>

                <h3>3. Implement Authentication</h3>
                <pre className="bg-gray-100 p-4 rounded-md">
                  {`// React example
import { useSSOAuth } from '@doneisbetter/sso-client/react';

function LoginButton() {
  const { login } = useSSOAuth();

  const handleLogin = async () => {
    try {
      const token = await login();
      // Store token and handle successful login
    } catch (error) {
      // Handle error
    }
  };

  return <button onClick={handleLogin}>Log In</button>;
}`}
                </pre>

                <h2>API Reference</h2>
                <h3>Authentication Endpoints</h3>
                
                <h4>POST /api/auth/create</h4>
                <p>Create a new authentication token.</p>
                <pre className="bg-gray-100 p-4 rounded-md">
                  {`// Request
POST /api/auth/create
Content-Type: application/json

{
  "identifier": "user-identifier"
}

// Response
{
  "token": "jwt-token"
}`}
                </pre>

                <h4>POST /api/auth/validate</h4>
                <p>Validate an existing token.</p>
                <pre className="bg-gray-100 p-4 rounded-md">
                  {`// Request
POST /api/auth/validate
Authorization: Bearer your-token

// Response
{
  "valid": true,
  "user": {
    "identifier": "user-identifier"
  }
}`}
                </pre>

                <h2>Security Considerations</h2>
                <ul>
                  <li>Always use HTTPS in production</li>
                  <li>Store tokens securely (e.g., in HttpOnly cookies)</li>
                  <li>Implement proper token validation on your server</li>
                  <li>Monitor and audit authentication attempts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
