import Head from 'next/head';
import Layout from '../../components/Layout';

export default function Documentation() {
  const documents = [
    {
      title: 'Integration Guide',
      description: 'Learn how to integrate SSO into your application',
      href: '/docs/integration'
    },
    {
      title: 'General Terms and Conditions',
      description: 'Our terms of service and usage policies',
      href: '/docs/gtc'
    },
    {
      title: 'Privacy Policy',
      description: 'How we handle and protect your data',
      href: '/docs/privacy-policy'
    }
  ];

  return (
    <Layout>
      <Head>
        <title>Documentation - SSO</title>
      </Head>
      
      <div className="container py-8">
        <div className="card">
          <h1 className="mb-8">Documentation</h1>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <a
                key={doc.href}
                href={doc.href}
                className="card hover:shadow-md transition-shadow"
              >
                <h2 className="text-indigo-600 mb-2">
                  {doc.title}
                </h2>
                <p className="text-gray-600 text-sm">
                  {doc.description}
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
