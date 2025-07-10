import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
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
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState("");

  /**
   * Generate a random state parameter for OAuth security
   */
  useEffect(() => {
    const randomState = Math.random().toString(36).substring(2);
    setState(randomState);
  }, []);
  
  /**
   * Handles form submission to authenticate SSO
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!identifier) {
      setMessage('Please enter an identifier');
      return;
    }

    handleSignIn();
  };

  /**
   * Handle NextAuth sign in
   */
  const handleSignIn = async () => {
    try {
      const result = await signIn('sso', {
        clientId: TEST_CLIENT.client_id,
        redirectUri: TEST_CLIENT.redirect_uri,
        identifier,
        callbackUrl: window.location.origin + '/sso-test',
        redirect: false
      });

      if (result?.error) {
        setMessage(`Error: ${result.error}`);
        return;
      }

      setMessage('Authentication succeeded!');
    } catch (error) {
      setMessage(`Error: ${error.message}`);
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
            Test the SSO integration with identifier authentication
          </p>
        </div>
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
              Authenticate
            </button>
          </div>
        </form>

        {message && (
          <div className="mt-4 text-center text-sm">
            <p className="text-gray-900">{message}</p>
          </div>
        )}

        <div className="mt-4 text-center text-xs text-gray-500">
          <p>State: {state}</p>
          <p>Client ID: {TEST_CLIENT.client_id}</p>
          <p>Redirect URI: {TEST_CLIENT.redirect_uri}</p>
        </div>
      </div>
    </div>
    </Layout>
  );
};

export default SSOTestPage;

