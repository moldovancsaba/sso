import { NextAuthOptions } from 'next-auth';
import { default as AuthHandler } from 'next-auth/next';
import { OAuthConfig } from 'next-auth/providers';

/**
 * NextAuth configuration with dynamic host detection for SSO integration.
 * Uses environment-based configuration for OAuth endpoints.
 */
export const authOptions: NextAuthOptions = {
  providers: [
{
      id: 'sso',
      name: 'SSO',
      type: 'oauth',
      authorization: {
        url: `${process.env.SSO_BASE_URL}/api/auth/custom-authorize`,
      },
      token: {
        url: `${process.env.SSO_BASE_URL}/api/oauth/token`,
      },
      userinfo: {
        url: `${process.env.SSO_BASE_URL}/api/auth/validate`,
      },
      clientId: process.env.SSO_CLIENT_ID,
      clientSecret: process.env.SSO_CLIENT_SECRET,
      profile(profile: any) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
        };
      },
    } as OAuthConfig<any>
  ],
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Export the NextAuth handler with our configuration
 */
export default AuthHandler(authOptions);
