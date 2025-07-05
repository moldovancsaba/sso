import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';

export default function Home() {
  const [identifier, setIdentifier] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [acceptedGtc, setAcceptedGtc] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier) {
      setError('Identifier is required');
      return;
    }
    
    if (!acceptedGtc || !acceptedPrivacy) {
      setError('Please accept both GTC and Privacy Policy to continue');
      return;
    }

    try {
      const res = await fetch('/api/auth/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      setToken(data.token);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Layout>
      <Head>
        <title>SSO</title>
      </Head>
      
      <div className="container py-8 md:py-12">
        <div className="max-w-md mx-auto">
          <div className="card">
            <h1 className="text-center mb-8">SSO</h1>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identifier
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="input"
                  placeholder="Enter any identifier"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="accept-gtc"
                    checked={acceptedGtc}
                    onChange={(e) => setAcceptedGtc(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                  />
                  <label htmlFor="accept-gtc" className="ml-2 block text-sm text-gray-900">
                    I accept the <a href="/docs/gtc" className="text-indigo-600 hover:text-indigo-800" target="_blank" rel="noopener noreferrer">General Terms and Conditions</a>
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="accept-privacy"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                  />
                  <label htmlFor="accept-privacy" className="ml-2 block text-sm text-gray-900">
                    I accept the <a href="/docs/privacy-policy" className="text-indigo-600 hover:text-indigo-800" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                  </label>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full">
                Get Token
              </button>
            </form>

            {error && (
              <div className="mt-4 text-sm text-red-600">{error}</div>
            )}

            {token && (
              <div className="mt-6 space-y-2">
                <h2>Your JWT Token:</h2>
                <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                  <code className="text-sm break-all">{token}</code>
                </div>
                <p className="text-sm text-gray-500">
                  This token will expire in 10 minutes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
