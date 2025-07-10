import React, { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Layout from "../components/Layout";

/**
 * OAuth client configuration for testing
 */
const TEST_CLIENT = {
  client_id: process.env.NEXT_PUBLIC_TEST_CLIENT_ID || "local_development_client",
  redirect_uri: "https://sso.doneisbetter.com/api/auth/callback/sso",
  response_type: "code"
};

/**
 * Sample page for testing SSO integration
 */
const SSOTestPage = () => {
  const { data: session, status } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === 'loading') {
      setMessage('Loading session...');
    } else if (status === 'authenticated' && session) {
setMessage(`Authenticated as ${session.user?.email || 'User'}`);
    } else {
      setMessage('Please authenticate to continue');
    }
  }, [session, status]);

  /**
   * Handles form submission to authenticate SSO
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!identifier) {
      setMessage('Please enter an identifier');
      return;
    }

    try {
      setMessage('Authenticating...');
      const result = await signIn('sso', {
        identifier,
        callbackUrl: window.location.origin + '/sso-test',
        redirect: true
      });

      if (result?.error) {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      setMessage('Logging out...');
      await signOut({ redirect: false });
      setMessage('Logged out successfully');
    } catch (error) {
      setMessage(`Error during logout: ${error.message}`);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              SSO Test Page
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {status === 'authenticated' 
                ? 'You are logged in successfully'
                : 'Test the SSO integration with identifier authentication'}
            </p>
          </div>

          {status === 'authenticated' ? (
            <div className="mt-8 space-y-6">
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      {message}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="identifier" className="sr-only">
                    Identifier
                  </label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {message && status !== 'authenticated' && (
            <div className="mt-4 text-center text-sm">
              <p className="text-gray-900">{message}</p>
            </div>
          )}

          <div className="mt-4 text-center text-xs text-gray-500">
            <p>Client ID: {TEST_CLIENT.client_id}</p>
            <p>Testing Environment: {process.env.NODE_ENV}</p>
          </div>
      </div>
    </div>
    </Layout>
  );
};

export default SSOTestPage;

