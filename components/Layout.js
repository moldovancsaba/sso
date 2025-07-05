import Link from 'next/link';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-gray-800">
                  Simple SSO
                </Link>
              </div>
              <div className="flex ml-6 space-x-8">
                <Link href="/" className="text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md text-sm font-medium">
                  Home
                </Link>
                <Link href="/docs/integration" className="text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md text-sm font-medium">
                  Integration Guide
                </Link>
                <Link href="/admin" className="text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md text-sm font-medium">
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
