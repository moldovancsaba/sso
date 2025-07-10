import { NextAuthOptions } from 'next-auth';
import NextAuth from 'next-auth/next';
import { getBaseUrl } from '../../../src/utils/url-config';
import { OAuthConfig } from 'next-auth/providers';
import { IdentityManager } from '../../../lib/identity/manager';
import { Identity } from '../../../lib/types/identity';

// Extend the basic User type with our custom fields
type ExtendedUser = {
  id: string;
  name?: string;
  email?: string;
  identity?: Identity;
};

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
        email: profile.email
      } as ExtendedUser;
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
    async signIn({ user }) {
      // Create or retrieve identity during sign in
      const identityManager = new IdentityManager();
      await identityManager.init();
      const identity = await identityManager.getOrCreate(user.id);
      
      // Attach identity to user object for use in session
      (user as ExtendedUser).identity = identity;
      return true;
    },
    
    async session({ session, token }) {
      // Add identity information to the session
      if ((token as any).identity) {
        (session as any).identity = (token as any).identity;
      }
      return session;
    },
    
    async jwt({ token, user }) {
      // Persist identity information in the JWT token
      const extendedUser = user as ExtendedUser;
      if (extendedUser?.identity) {
        (token as any).identity = extendedUser.identity;
      }
      return token;
    },
    
    redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
};

  return NextAuth(req, res, options);
};

export default handler;
