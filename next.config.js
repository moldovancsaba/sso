/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable the experimental App Router features
  experimental: {
    appDir: false,
  },
  // Configure page extensions
  pageExtensions: ['tsx', 'ts'],
  // Optimize output
  poweredByHeader: false,
  compress: true,
  // Handle 404s properly
  async rewrites() {
    return [];
  },
}
