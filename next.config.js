/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode ayuda a detectar problemas potenciales durante el desarrollo
  reactStrictMode: true,

  // Imágenes: optimización automática
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Soporta legacy decorators si los specs lo requieren
  experimental: {
    esmExternals: true,
  },
};

module.exports = nextConfig;
