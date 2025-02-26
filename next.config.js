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
  },
  // Add API configuration to increase body size limit
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase the size limit to 10MB
    },
    responseLimit: false,
  }
}

module.exports = nextConfig 