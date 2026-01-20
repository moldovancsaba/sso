/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx'],
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  // WHAT: Rewrite .well-known endpoints and OAuth endpoints to /api
  // WHY: OIDC standard requires /.well-known and OAuth standard expects /authorize, /token at root
  async rewrites() {
    return [
      {
        source: '/.well-known/jwks.json',
        destination: '/api/.well-known/jwks.json',
      },
      {
        source: '/.well-known/openid-configuration',
        destination: '/api/.well-known/openid-configuration',
      },
      {
        source: '/authorize',
        destination: '/api/oauth/authorize',
      },
      {
        source: '/token',
        destination: '/api/oauth/token',
      },
      {
        source: '/userinfo',
        destination: '/api/oauth/userinfo',
      },
    ]
  },
}

export default nextConfig
