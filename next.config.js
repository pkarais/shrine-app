/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium', 'pdfjs-dist'],
    serverActions: {
      bodySizeLimit: '200mb',
    },
    outputFileTracingIncludes: {
      '/api/schedule/parse': [
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'eqgikumohnvgdkwlzkus.supabase.co',
        pathname: '/storage/v1/**',
      },
    ],
  },
}

module.exports = nextConfig
