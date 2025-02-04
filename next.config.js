/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': '.',
        '@/components': './components',
        '@/lib': './lib'
      }
    }
    return config
  }
}

module.exports = nextConfig 