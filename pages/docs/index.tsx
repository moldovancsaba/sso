import { useState } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';

export default function Documentation() {
  const [activeTab, setActiveTab] = useState('getting-started');

  return (
    <Layout>
      <Head>
        <title>SSO Documentation - Done is Better</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">SSO Documentation</h1>
              
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('getting-started')}
                    className={`${
                      activeTab === 'getting-started'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Getting Started
                  </button>
                  <button
                    onClick={() => setActiveTab('api-reference')}
                    className={`${
                      activeTab === 'api-reference'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    API Reference
                  </button>
                  <button
                    onClick={() => setActiveTab('examples')}
                    className={`${
                      activeTab === 'examples'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Examples
                  </button>
                </nav>
              </div>

              <div className="mt-6">
                {activeTab === 'getting-started' && (
                  <div className="prose max-w-none">
                    <h2>Getting Started</h2>
                    <p>Follow these steps to integrate SSO into your application:</p>
                    <ol>
                      <li>Create an account and obtain your API keys from the admin dashboard</li>
                      <li>Install our client library:
                        <pre>npm install @doneisbetter/sso-client</pre>
                      </li>
                      <li>Initialize the client in your application:
                        <pre>{`
import { SSOClient } from '@doneisbetter/sso-client';

const sso = new SSOClient({
  apiKey: 'your-api-key',
  tenant: 'your-tenant-id'
});`}
                        </pre>
                      </li>
                    </ol>
                  </div>
                )}

                {activeTab === 'api-reference' && (
                  <div className="prose max-w-none">
                    <h2>API Reference</h2>
                    <h3>Authentication</h3>
                    <p>All API requests require authentication using your API key in the header:</p>
                    <pre>
                      Authorization: Bearer your-api-key
                    </pre>

                    <h3>Endpoints</h3>
                    <h4>POST /api/auth/login</h4>
                    <p>Authenticate a user and receive a session token.</p>
                    <pre>{`
{
  "email": "user@example.com",
  "password": "user-password"
}`}
                    </pre>
                  </div>
                )}

                {activeTab === 'examples' && (
                  <div className="prose max-w-none">
                    <h2>Code Examples</h2>
                    <h3>React Integration</h3>
                    <pre>{`
import { useSSO } from '@doneisbetter/sso-client/react';

function LoginButton() {
  const { login } = useSSO();
  
  const handleLogin = async () => {
    try {
      await login();
      // Handle successful login
    } catch (error) {
      // Handle error
    }
  };

  return <button onClick={handleLogin}>Log In</button>;
}`}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
