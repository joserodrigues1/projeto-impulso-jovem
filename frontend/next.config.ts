import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: process.env.API_INTERNAL_URL 
          ? `${process.env.API_INTERNAL_URL}/api/v1/:path*` 
          : "http://localhost:3333/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
