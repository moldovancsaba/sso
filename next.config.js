/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx'],
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true
  }
}

export default nextConfig
