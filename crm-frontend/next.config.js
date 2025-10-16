/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Variables d'environnement
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  },
  
  // Rewrites pour proxy API (optionnel)
  async rewrites() {
    const apiProxyBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')
    if (!apiProxyBase) {
      return []
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiProxyBase}/:path*`,
      },
    ]
  },
};

module.exports = nextConfig;
