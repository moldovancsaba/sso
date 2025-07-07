import { NextAuthOptions } from 'next-auth';
import NextAuth from 'next-auth/next';
import { getBaseUrl } from '../../../src/utils/url-config';
import { OAuthConfig } from 'next-auth/providers';

const handler = (req: any, res: any) => {
  // Get the correct base URL for the current environment
  const baseUrl = getBaseUrl(req);
  
  // Set NEXTAUTH_URL dynamically based on the request
  process.env.NEXTAUTH_URL = baseUrl;

  const options: NextAuthOptions = {
  providers: [
{
      id: 'sso',
      name: 'SSO',
      type: 'oauth',
      authorization: `${baseUrl}/api/auth/custom-authorize?scope=openid+profile+email`,
      token: `${baseUrl}/api/oauth/token`,
      userinfo: `${baseUrl}/api/auth/validate`,
      clientId: process.env.OAUTH_CLIENT_ID || 'local_development_client',
      clientSecret: process.env.OAUTH_CLIENT_SECRET || 'local_development_secret',
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
  
  // Ensure callbacks use the correct URL
  callbacks: {
    redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
};

  return NextAuth(req, res, options);
};

export default handler;
