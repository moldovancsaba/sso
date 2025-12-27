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
  // WHAT: Rewrite .well-known endpoints to /api/.well-known
  // WHY: OIDC standard requires /.well-known/jwks.json but Next.js serves from /api
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
    ]
  },
}

export default nextConfig
