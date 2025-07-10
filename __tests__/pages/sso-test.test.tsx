/**
 * SSO Test Page Test Suite
 * ======================
 * 
 * This test suite verifies the functionality of the SSO (Single Sign-On) test page,
 * which demonstrates and validates the authentication flow in our application.
 * 
 * Authentication Flow:
 * ------------------
 * 1. Initial State: Page loads with a login form if user is not authenticated
 * 2. Authentication: 
 *    - User enters their identifier
 *    - System initiates SSO flow via next-auth
 *    - On success: User is redirected to the callback URL
 *    - On failure: Error message is displayed
 * 3. Session Management:
 *    - Active sessions are persisted across page reloads
 *    - Sessions timeout after expiration
 *    - Logout invalidates the session
 * 
 * Error Handling Strategy:
 * ----------------------
 * The application handles various error scenarios:
 * - Invalid credentials: Shows "Invalid credentials" error
 * - Network errors: Displays connection-related errors
 * - Invalid tokens: Shows token validation errors
 * - Session timeouts: Prompts user to re-authenticate
 * - Multiple logout attempts: Prevents duplicate logout calls
 * 
 * Usage Examples:
 * --------------
 * 1. Successful Login:
 *    ```tsx
 *    const SSOTest = () => {
 *      const { data: session } = useSession();
 *      return (
 *        <div>
 *          {!session ? (
 *            <button onClick={() => signIn('sso')}>Sign In</button>
 *          ) : (
 *            <div>Welcome, {session.user.name}!</div>
 *          )}
 *        </div>
 *      );
 *    };
 *    ```
 * 
 * 2. Error Handling:
 *    ```tsx
 *    const handleLogin = async () => {
 *      try {
 *        const result = await signIn('sso', { redirect: false });
 *        if (result?.error) {
 *          setError(result.error);
 *        }
 *      } catch (error) {
 *        setError('Network error occurred');
 *      }
 *    };
 *    ```
 */

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

it('handles invalid token error', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });

    (signIn as jest.Mock).mockResolvedValue({
      error: 'Invalid token',
      status: 403,
      ok: false
    });

    render(<SSOTestPage />);

    const identifierInput = screen.getByPlaceholderText('Enter your identifier');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    fireEvent.change(identifierInput, { target: { value: 'testuser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Invalid token')).toBeInTheDocument();
    });
  });

  it('handles network error on login attempt', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });

    (signIn as jest.Mock).mockRejectedValue(new Error('Network Error'));

    render(<SSOTestPage />);

    const identifierInput = screen.getByPlaceholderText('Enter your identifier');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    fireEvent.change(identifierInput, { target: { value: 'testuser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Network Error')).toBeInTheDocument();
    });
  });

  it('persists session across reloads', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          name: 'Persisted User',
          email: 'persisteduser@example.com'}},
      status: 'authenticated'
    });

    render(<SSOTestPage />);

    await waitFor(() => {
      expect(screen.getByText('You are logged in successfully')).toBeInTheDocument();
      expect(screen.getByText('Persisted User')).toBeInTheDocument();
    });
  });

it('handles session timeout', async () => {
    // First mock an authenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        expires: '2023-01-01' // Expired date
      },
      status: 'authenticated'
    });

    render(<SSOTestPage />);

    // Then simulate session expiry
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });

    await waitFor(() => {
      expect(screen.getByText('Session expired. Please sign in again.')).toBeInTheDocument();
    });
  });

  it('handles multiple logout attempts gracefully', async () => {
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

    // First logout attempt
    fireEvent.click(logoutButton);
    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({ redirect: false });
    });

    // Second logout attempt should be prevented
    (signOut as jest.Mock).mockRejectedValue(new Error('Already logged out'));
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Already logged out')).toBeInTheDocument();
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
