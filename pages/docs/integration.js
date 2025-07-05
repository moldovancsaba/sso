import Layout from '../../components/Layout';

const CodeBlock = ({ children }) => (
  <pre className="bg-gray-100 p-4 rounded-md my-4 overflow-x-auto">
    <code>{children}</code>
  </pre>
);

export default function IntegrationGuide() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Integration Guide</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
          <p className="mb-4">
            Integrate thanperfect SSO in three simple steps:
          </p>
          
          <h3 className="text-xl font-semibold mt-6 mb-2">1. Redirect to thanperfect</h3>
          <p className="mb-2">Send users to thanperfect with your callback URL:</p>
          <CodeBlock>
            https://thanperfect.com?redirect=https://yourapp.com/callback
          </CodeBlock>

          <h3 className="text-xl font-semibold mt-6 mb-2">2. Handle the Callback</h3>
          <p className="mb-2">Users will be redirected back with a token:</p>
          <CodeBlock>
            https://yourapp.com/callback?token=abc123
          </CodeBlock>

          <h3 className="text-xl font-semibold mt-6 mb-2">3. Validate the Token</h3>
          <p className="mb-2">Verify the token using our validation endpoint:</p>
          <CodeBlock>
            GET https://thanperfect.com/api/validate?token=abc123
          </CodeBlock>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Token Details</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Tokens are generated using <code className="bg-gray-100 px-1">crypto.randomUUID()</code></li>
            <li>Valid for <strong>10 minutes</strong> only</li>
            <li>No refresh or extension available</li>
            <li>Re-authentication required after expiry</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">API Reference</h2>
          
          <h3 className="text-xl font-semibold mt-6 mb-2">Token Validation Endpoint</h3>
          <p className="mb-4">
            <code className="bg-gray-100 px-1">GET /api/validate</code>
          </p>
          
          <h4 className="font-semibold mt-4 mb-2">Query Parameters</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li><code className="bg-gray-100 px-1">token</code> (required) - The token to validate</li>
          </ul>

          <h4 className="font-semibold mt-4 mb-2">Response Format</h4>
          <CodeBlock>
            {JSON.stringify({
              valid: true,
              identifier: "example",
              expires: "2025-07-05T17:09:52Z"
            }, null, 2)}
          </CodeBlock>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Need Help?</h2>
          <p>
            Check our <a href="https://github.com/moldovancsaba/thanperfect" className="text-blue-600 hover:underline">GitHub repository</a> for 
            more examples and detailed documentation.
          </p>
        </section>
      </div>
    </Layout>
  );
}
