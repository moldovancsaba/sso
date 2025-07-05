import { render, screen } from '@testing-library/react'
import Layout from '../../components/Layout'

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
