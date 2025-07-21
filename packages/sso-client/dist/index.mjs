// src/index.ts
var SSOClient = class {
  /**
   * Create a new SSO client instance
   * 
   * @param ssoServerUrl Base URL of the SSO server
   * @param options Configuration options
   */
  constructor(ssoServerUrl, options = {}) {
    this.ssoServerUrl = ssoServerUrl.replace(/\/$/, "");
    this.validateEndpoint = `${this.ssoServerUrl}${options.validatePath || "/api/sso/validate"}`;
    this.logoutEndpoint = `${this.ssoServerUrl}${options.logoutPath || "/api/users/logout"}`;
    this.loginPath = options.loginPath || "/";
    this.headers = {
      "Content-Type": "application/json",
      ...options.headers
    };
  }
  /**
   * Validate the current session
   * 
   * @returns Session validation response
   * @throws Error if request fails
   */
  async validateSession() {
    try {
      const response = await fetch(this.validateEndpoint, {
        method: "GET",
        credentials: "include",
        headers: this.headers
      });
      if (!response.ok) {
        const error = await response.json();
        return {
          isValid: false,
          message: error.message || "Session validation failed"
        };
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("SSO validation error:", error);
      return {
        isValid: false,
        message: error instanceof Error ? error.message : "Failed to validate SSO session"
      };
    }
  }
  /**
   * Sign out the current user
   * 
   * @returns True if logout was successful
   * @throws Error if request fails
   */
  async signOut() {
    try {
      const response = await fetch(this.logoutEndpoint, {
        method: "POST",
        credentials: "include",
        headers: this.headers
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Logout failed");
      }
      return true;
    } catch (error) {
      console.error("SSO logout error:", error);
      throw error;
    }
  }
  /**
   * Redirect to the login page
   * 
   * @param redirectUrl Optional URL to redirect to after login
   */
  redirectToLogin(redirectUrl) {
    const currentUrl = redirectUrl || window.location.href;
    const encodedUrl = encodeURIComponent(currentUrl);
    window.location.href = `${this.ssoServerUrl}${this.loginPath}?redirect=${encodedUrl}`;
  }
  /**
   * Enable automatic session monitoring
   * 
   * @param options Monitoring configuration
   * @returns Cleanup function to stop monitoring
   */
  enableSessionMonitoring(options = {}) {
    const interval = options.interval || 6e4;
    const checkSession = async () => {
      try {
        const result = await this.validateSession();
        if (!result.isValid && options.onInvalidSession) {
          options.onInvalidSession();
        }
      } catch (error) {
        if (options.onError) {
          options.onError(error instanceof Error ? error : new Error("Session check failed"));
        }
      }
    };
    const timer = setInterval(checkSession, interval);
    return () => clearInterval(timer);
  }
};
export {
  SSOClient
};
