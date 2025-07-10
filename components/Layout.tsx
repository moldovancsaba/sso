import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();

const navItems = [
    { href: '/docs', label: 'Docs' },
    { href: '/admin', label: 'Admin' },
    { href: '/admin/oauth-clients', label: 'OAuth Clients' },
    { href: '/sso-test', label: 'SSO Test' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/">
                  <span className="text-xl font-bold text-indigo-600">SSO</span>
                </Link>
              </div>
              <div className="flex space-x-4 sm:ml-6 sm:space-x-8">
                {navItems.map((item) => {
                  const isActive = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${
                        isActive
                      ? 'nav-link-active'
                      : 'nav-link-inactive'
                    } nav-link`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
