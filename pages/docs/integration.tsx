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
                <h3>Installation</h3>
                <pre className="bg-gray-100 p-4 rounded-md">
                  npm install @doneisbetter/sso
                  
// Create a token
                  const token = "example-token";
                  
                  // Validate a token
                  const isValid = token === "example-token";
                </pre>
                <h3>NextAuth.js Integration</h3>
                <p>Learn how to set up the SSO service with NextAuth.js using OAuth:</p>
                <pre className='bg-gray-100 p-4 rounded-md'>
                  {`import NextAuth from 'next-auth';
import { OAuth2Provider } from 'next-auth/providers';

export default NextAuth({
  providers: [
    OAuth2Provider({`
                        id: 'sso',
                        name: 'SSO',
                        type: 'oauth',
                        clientId: process.env.SSO_CLIENT_ID,
                        clientSecret: process.env.SSO_CLIENT_SECRET,
                        authorization: {
                          url: 'https://sso.doneisbetter.com/api/oauth/authorize',
                          params: { response_type: 'code' }
                        },
                        token: 'https://sso.doneisbetter.com/api/oauth/token',
                        userinfo: {
                          url: 'https://sso.doneisbetter.com/api/auth/validate',
                          async request({ tokens }) {
                            return {
                              id: tokens.sub,
                              identifier: tokens.identifier
                            };
                          }
                        }
                      })
                    ]
                  });
                </pre>
                <h2>OAuth Endpoints</h2>
                <p>Details on the OAuth endpoints provided by the SSO service:</p>
                <h3>Authorization Endpoint</h3>
                <p>URL: /api/oauth/authorize</p>
                <p>Method: GET / POST</p>
                <p>Parameters:</p>
                <ul>
                  <li>client_id: Your OAuth client ID</li>
                  <li>redirect_uri: Your callback URL</li>
                  <li>response_type: Must be "code"</li>
                  <li>state: (Optional) State parameter for security</li>
                </ul>
                <h3>Token Endpoint</h3>
                <p>URL: /api/oauth/token</p>
                <pre className='bg-gray-100 p-4 rounded-md'>
                  method: POST
                  grant_type: Must be "authorization_code"
                  code: The authorization code
                  client_id: Your OAuth client ID
                  client_secret: Your OAuth client secret
                  redirect_uri: Must match the authorization redirect URI
                </pre>
                <h2>API Reference</h2>
                <p>Endpoints to manage OAuth clients and tokens:</p>
                <h3>Token Management Endpoints</h3>
                <h4>Create Token</h4>
                <p>POST /api/auth/create</p>
                <p>Create a new authentication token.</p>
                <pre className='bg-gray-100 p-4 rounded-md'>
                  /api/auth/create
                  {
                    "identifier": "user-identifier"
                  }
                </pre>
                <h4>Validate Token</h4>
                <p>POST /api/auth/validate</p>
                <pre className='bg-gray-100 p-4 rounded-md'>
                  {
                    "valid": true,
                    "user": {
                      "identifier": "user-identifier"
                    }
                  }
                </pre>
                <h2>Security Considerations</h2>
                <p>Ensure best practices for security:</p>
                <ul>
                  <li>Use HTTPS in production</li>
                  <li>Validate all tokens on your server</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
