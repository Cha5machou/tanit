/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['storage.googleapis.com', 'firebasestorage.googleapis.com'],
  },
  // Pour optimiser le build Netlify
  output: 'standalone',
}

module.exports = nextConfig

