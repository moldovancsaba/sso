class SSOClient {
  constructor(ssoServerUrl, options = {}) {
    this.ssoServerUrl = ssoServerUrl;
    this.validateEndpoint = `${ssoServerUrl}/api/sso/validate`;
    this.loginPath = options.loginPath || '/';
  }

  async validateSession() {
    try {
      const response = await fetch(this.validateEndpoint, {
        method: 'GET',
        credentials: 'include', // Important for sending cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('SSO validation error:', error);
      return {
        isValid: false,
        message: 'Failed to validate SSO session'
      };
    }
  }

  redirectToLogin() {
    const currentUrl = encodeURIComponent(window.location.href);
    window.location.href = `${this.ssoServerUrl}${this.loginPath}?redirect=${currentUrl}`;
  }
}
