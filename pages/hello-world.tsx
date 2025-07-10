import React, { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Layout from "../components/Layout";
import { TEST_CLIENT } from "../lib/constants";

/**
 * Page for presenting Hello World
 */
const HelloWorldPage = () => {
  const { data: session, status } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");

  /**
   * Handles session state changes and interactions
   */
  useEffect(() => {
    if (status === 'loading') {
      setMessage('Loading...');
    } else if (status === 'authenticated' && session) {
      setMessage(`Welcome ${session.user?.email || 'World'}`);
    } else if (status === 'unauthenticated') {
      setIdentifier('');
      setMessage('Please sign in');
    }
  }, [session, status]);

  /**
   * Handles form submission
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!identifier) {
      setMessage('Please enter your name');
      return;
    }

    try {
      setMessage('Authenticating...');
      const result = await signIn('sso', {
        identifier,
        callbackUrl: `${window.location.origin}/hello-world`,
        redirect: true
      });

      if (result?.error) {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setMessage(`Error: ${error.message}`);
    }
  };

  /**
   * Handles user logout
   */
  const handleLogout = async () => {
    try {
      setMessage('Logging out...');
      await signOut({
        redirect: true,
        callbackUrl: `${window.location.origin}/hello-world`
      });
    } catch (error) {
      setMessage(`Logout error: ${error.message}`);
      window.location.reload();
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Hello World Page
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {status === 'authenticated' 
                ? 'Greetings to you, explorer'
                : 'Join the adventure'}
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
                      Welcome {session?.user?.email || 'World'}
                    </p>
                    <p className="mt-2 text-sm text-green-700">
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
                    Name
                  </label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your name"
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
            <div className="mt-4 text-center">
              <div className={`rounded-md p-4 ${message.includes('Error') ? 'bg-red-50' : 'bg-blue-50'}`}
>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {message.includes('Error') ? (
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${message.includes('Error') ? 'text-red-800' : 'text-blue-800'}`}
>
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 text-center text-xs text-gray-500">
            <p>Client ID: {TEST_CLIENT.clientId}</p>
            <p>Environment: {process.env.NODE_ENV}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HelloWorldPage;

