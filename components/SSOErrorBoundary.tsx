import React from 'react';
import { signOut } from 'next-auth/react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class SSOErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('SSO Error:', error);
    console.error('Error details:', info);

    // Clear session and reload on critical errors
    signOut({ redirect: true });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-2">An error occurred</h2>
            <p className="text-gray-600">The application will reload momentarily...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SSOErrorBoundary;
