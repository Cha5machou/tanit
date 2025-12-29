/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['storage.googleapis.com', 'firebasestorage.googleapis.com'],
  },
  // Standalone output for Cloud Run deployment (only for production)
  // output: 'standalone',
}

module.exports = nextConfig

