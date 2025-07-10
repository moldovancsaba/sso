import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession, signIn, signOut } from 'next-auth/react';
import SSOTestPage from './sso-test';

// Mock next-auth
jest.mock('next-auth/react');

// Mock the Layout component
jest.mock('../components/Layout', () => {
  return function DummyLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="layout">{children}</div>;
  };
});

describe('SSOTestPage', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form when not authenticated', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });

    render(<SSOTestPage />);

    expect(screen.getByText('SSO Test Page')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your identifier')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows loading state', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading'
    });

    render(<SSOTestPage />);

    expect(screen.getByText('Loading session...')).toBeInTheDocument();
  });

  it('shows authenticated state with logout button', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        expires: '2025-07-11'
      },
      status: 'authenticated'
    });

    render(<SSOTestPage />);

    expect(screen.getByText('You are logged in successfully')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
  });

  it('handles login submission', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });

    (signIn as jest.Mock).mockResolvedValue({
      error: null,
      status: 200,
      ok: true,
      url: '/sso-test'
    });

    render(<SSOTestPage />);

    const identifierInput = screen.getByPlaceholderText('Enter your identifier');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    fireEvent.change(identifierInput, { target: { value: 'testuser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('sso', {
        identifier: 'testuser',
        callbackUrl: expect.stringContaining('/sso-test'),
        redirect: true
      });
    });
  });

  it('handles logout', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        expires: '2025-07-11'
      },
      status: 'authenticated'
    });

    render(<SSOTestPage />);

    const logoutButton = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({ redirect: false });
    });
  });

  it('shows error message on login failure', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });

    (signIn as jest.Mock).mockResolvedValue({
      error: 'Invalid credentials',
      status: 401,
      ok: false
    });

    render(<SSOTestPage />);

    const identifierInput = screen.getByPlaceholderText('Enter your identifier');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    fireEvent.change(identifierInput, { target: { value: 'testuser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Invalid credentials')).toBeInTheDocument();
    });
  });
});
