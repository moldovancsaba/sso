import 'next-auth';

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    id: string;
    identifier: string;
    email?: string;
  }
}

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      identifier: string;
      email?: string;
    };
  }
}
