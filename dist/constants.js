/**
 * Test OAuth client configuration used for development
 */
export const TEST_CLIENT = {
    clientId: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || 'test-client',
    clientSecret: process.env.OAUTH_CLIENT_SECRET || 'test-secret',
    redirectUri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || 'http://localhost:3000/hello-world'
};
//# sourceMappingURL=constants.js.map