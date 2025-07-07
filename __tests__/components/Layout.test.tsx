import { render, screen } from '@testing-library/react'
import Layout from '../../components/Layout'

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
  }),
}));

// Mock next/link to use a regular anchor tag
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Layout', () => {
  it('renders navigation items', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    )

    // Check for navigation links
    expect(screen.getByText('Docs')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('OAuth Clients')).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders SSO logo/title', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    )

    expect(screen.getByText('SSO')).toBeInTheDocument()
  })
})
