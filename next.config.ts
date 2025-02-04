import type { Configuration } from 'webpack'
import type { NextConfig } from 'next'

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  webpack: (config: Configuration) => {
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

export default nextConfig
