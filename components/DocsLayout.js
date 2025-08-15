import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/docs-layout.module.css';

export default function DocsLayout({ children }) {
  const router = useRouter();

  const navigation = [
    { 
      title: 'Getting Started',
      links: [
        { href: '/docs', label: 'Introduction' },
        { href: '/docs/quickstart', label: 'Quick Start' },
        { href: '/docs/installation', label: 'Installation' },
      ]
    },
    {
      title: 'Integration Guide',
      links: [
        { href: '/docs/authentication', label: 'Authentication' },
        { href: '/docs/session-management', label: 'Session Management' },
        { href: '/docs/error-handling', label: 'Error Handling' },
      ]
    },
    {
      title: 'API Reference',
      links: [
        { href: '/docs/api/endpoints', label: 'Endpoints' },
        { href: '/docs/api/responses', label: 'Response Format' },
        { href: '/docs/api/errors', label: 'Error Codes' },
      ]
    },
    {
      title: 'Examples',
      links: [
        { href: '/docs/examples/react', label: 'React' },
        { href: '/docs/examples/vue', label: 'Vue.js' },
        { href: '/docs/examples/vanilla', label: 'Vanilla JS' },
      ]
    },
    {
      title: 'Security',
      links: [
        { href: '/docs/security/best-practices', label: 'Best Practices' },
        { href: '/docs/security/cors', label: 'CORS Configuration' },
        { href: '/docs/security/permissions', label: 'Permissions' },
      ]
    }
  ];

  return (
    <div className={styles.container}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/">
            <img src="/logo.svg" alt="DoneIsBetter SSO" className={styles.logo} />
          </Link>
          <select 
            className={styles.versionSelect}
            defaultValue="v1.0.0"
          >
            <option value="v1.0.0">v1.0.0</option>
          </select>
        </div>

        <div className={styles.sidebarContent}>
          {navigation.map((section, i) => (
            <div key={i} className={styles.section}>
              <h3>{section.title}</h3>
              <ul>
                {section.links.map((link, j) => (
                  <li key={j}>
                    <Link
                      href={link.href}
                      className={router.pathname === link.href ? styles.active : ''}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <main className={styles.content}>
        <div className={styles.contentHeader}>
          <div className={styles.search}>
            <input
              type="text"
              placeholder="Search documentation..."
              className={styles.searchInput}
            />
          </div>
          <div className={styles.headerLinks}>
            <a href="https://github.com/doneisbetter/sso" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="mailto:support@doneisbetter.com">Support</a>
          </div>
        </div>

        <div className={styles.contentBody}>
          {children}
        </div>

        <footer className={styles.footer}>
          <p>© 2025 DoneIsBetter. All rights reserved.</p>
          <div className={styles.footerLinks}>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
