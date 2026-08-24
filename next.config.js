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
  // WHAT: run page-data collection and static generation in-process, on one worker.
  // WHY: `next build` forks parallel workers for those phases, and they race against the
  //      webpack output they read. The symptom is a build that fails with
  //      "Cannot find module .next/server/pages/<page>.js" AFTER "Compiled successfully" --
  //      Next cannot find the file it just emitted. Measured on an unchanged tree 2026-08-24:
  //      three consecutive clean builds went fail / pass / fail, and the set of pages named
  //      was different every time (docs/api/errors + docs/api/responses, then none, then
  //      admin/users + docs/admin-approval + docs/api). A per-page defect cannot move between
  //      pages on an identical tree; a race can.
  //      This matters beyond a local annoyance: the same race runs on Vercel, where a failed
  //      production build of the SSO service takes down login for every app that depends on it,
  //      and a passing retry would make it look transient rather than real.
  //      The cost is build time on 34 pages, which is the correct trade against a deploy that
  //      fails at random.
  experimental: {
    workerThreads: false,
    cpus: 1,
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
