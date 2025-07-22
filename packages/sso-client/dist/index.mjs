// src/index.ts
var SSOErrorType = /* @__PURE__ */ ((SSOErrorType2) => {
  SSOErrorType2["NETWORK"] = "NETWORK_ERROR";
  SSOErrorType2["VALIDATION"] = "VALIDATION_ERROR";
  SSOErrorType2["AUTHENTICATION"] = "AUTHENTICATION_ERROR";
  SSOErrorType2["CONFIGURATION"] = "CONFIGURATION_ERROR";
  return SSOErrorType2;
})(SSOErrorType || {});
var SSOError = class extends Error {
  constructor(message, type, cause) {
    super(message);
    this.type = type;
    this.cause = cause;
    this.name = "SSOError";
  }
};
async function backoffDelay(attempt, baseDelay) {
  const delay = baseDelay * Math.pow(2, attempt - 1);
  await new Promise((resolve) => setTimeout(resolve, delay));
}
var SSOClient = class {
  /**
   * Create a new SSO client instance
   * 
   * @param ssoServerUrl Base URL of the SSO server
   * @param options Configuration options
   */
  constructor(ssoServerUrl, options = {}) {
    this.isMonitoring = false;
    if (!ssoServerUrl) {
      throw new SSOError("SSO server URL is required", "CONFIGURATION_ERROR" /* CONFIGURATION */);
    }
    this.ssoServerUrl = ssoServerUrl.replace(/\/$/, "");
    this.validateEndpoint = `${this.ssoServerUrl}${options.validatePath || "/api/sso/validate"}`;
    this.logoutEndpoint = `${this.ssoServerUrl}${options.logoutPath || "/api/users/logout"}`;
    this.loginPath = options.loginPath || "/";
    this.headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...options.headers
    };
    this.timeout = options.timeout || 1e4;
    this.maxRetries = options.retry?.maxAttempts || 3;
    this.baseRetryDelay = options.retry?.baseDelay || 1e3;
  }
  /**
   * Validate the current session
   * 
   * @returns Session validation response
   * @throws Error if request fails
   */
  /**
   * Makes a request to the SSO server with retry and timeout handling
   * @param url Request URL
   * @param init Request init options
   * @returns Response from the server
   * @throws SSOError if the request fails after retries
   */
  async makeRequest(url, init) {
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        const response = await fetch(url, {
          ...init,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new SSOError("Request timed out", "NETWORK_ERROR" /* NETWORK */, error);
        }
        if (attempt === this.maxRetries) {
          throw new SSOError(
            "Request failed after max retries",
            "NETWORK_ERROR" /* NETWORK */,
            lastError
          );
        }
        await backoffDelay(attempt, this.baseRetryDelay);
      }
    }
    throw new SSOError("Unexpected error", "NETWORK_ERROR" /* NETWORK */, lastError);
  }
  /**
   * Validate the current session
   * 
   * @returns Session validation response
   * @throws SSOError if validation fails
   */
  async validateSession() {
    try {
      const response = await this.makeRequest(this.validateEndpoint, {
        method: "GET",
        credentials: "include",
        headers: this.headers
      });
      const data = await response.json();
      if (!response.ok) {
        throw new SSOError(
          data.message || "Session validation failed",
          "VALIDATION_ERROR" /* VALIDATION */,
          data
        );
      }
      return data;
    } catch (error) {
      if (error instanceof SSOError) {
        throw error;
      }
      throw new SSOError(
        "Failed to validate SSO session",
        "VALIDATION_ERROR" /* VALIDATION */,
        error
      );
    }
  }
  /**
   * Sign out the current user
   * 
   * @returns True if logout was successful
   * @throws Error if request fails
   */
  /**
   * Sign out the current user
   * 
   * @returns True if logout was successful
   * @throws SSOError if logout fails
   */
  async signOut() {
    try {
      const response = await this.makeRequest(this.logoutEndpoint, {
        method: "POST",
        credentials: "include",
        headers: this.headers
      });
      const data = await response.json();
      if (!response.ok) {
        throw new SSOError(
          data.message || "Logout failed",
          "AUTHENTICATION_ERROR" /* AUTHENTICATION */,
          data
        );
      }
      this.stopSessionMonitoring();
      return true;
    } catch (error) {
      if (error instanceof SSOError) {
        throw error;
      }
      throw new SSOError(
        "Failed to sign out",
        "AUTHENTICATION_ERROR" /* AUTHENTICATION */,
        error
      );
    }
  }
  /**
   * Redirect to the login page
   * 
   * @param redirectUrl Optional URL to redirect to after login
   */
  /**
   * Redirect to the login page
   * 
   * @param redirectUrl Optional URL to redirect to after login
   * @throws SSOError if redirect URL is invalid
   */
  redirectToLogin(redirectUrl) {
    try {
      const currentUrl = redirectUrl || window.location.href;
      new URL(currentUrl);
      const encodedUrl = encodeURIComponent(currentUrl);
      window.location.href = `${this.ssoServerUrl}${this.loginPath}?redirect=${encodedUrl}`;
    } catch (error) {
      throw new SSOError(
        "Invalid redirect URL",
        "CONFIGURATION_ERROR" /* CONFIGURATION */,
        error
      );
    }
  }
  /**
   * Enable automatic session monitoring
   * 
   * @param options Monitoring configuration
   * @returns Cleanup function to stop monitoring
   */
  /**
   * Enable automatic session monitoring
   * 
   * @param options Monitoring configuration
   * @returns Cleanup function to stop monitoring
   * @throws SSOError if monitoring is already enabled
   */
  enableSessionMonitoring(options = {}) {
    if (this.isMonitoring) {
      throw new SSOError(
        "Session monitoring is already enabled",
        "CONFIGURATION_ERROR" /* CONFIGURATION */
      );
    }
    const interval = Math.max(options.interval || 6e4, 1e4);
    const checkSession = async () => {
      try {
        const result = await this.validateSession();
        if (!result.isValid && options.onInvalidSession) {
          options.onInvalidSession();
        }
      } catch (error) {
        if (options.onError) {
          options.onError(
            error instanceof SSOError ? error : new SSOError("Session check failed", "VALIDATION_ERROR" /* VALIDATION */, error)
          );
        }
      }
    };
    void checkSession();
    this.monitoringTimer = setInterval(checkSession, interval);
    this.isMonitoring = true;
    return () => this.stopSessionMonitoring();
  }
  /**
   * Stop session monitoring if it's active
   */
  stopSessionMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = void 0;
      this.isMonitoring = false;
    }
  }
};
export {
  SSOClient,
  SSOError,
  SSOErrorType
};
