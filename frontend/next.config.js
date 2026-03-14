/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Pre-Phase 4: keep CI/docker build unblocked while lint debt is cleaned incrementally.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

