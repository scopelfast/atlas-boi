/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Não definir allowedDevOrigins aqui: no Next 14 isso ativa modo "block" e pode
  // barrar assets /_next/* no celular (sec-fetch cross-site). Em dev, o padrão é só avisar.
  webpack: (config, { dev }) => {
    if (dev && process.platform === "win32") {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 500,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
