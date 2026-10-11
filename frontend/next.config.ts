import type { NextConfig } from "next";

/** Cabeçalhos de segurança aplicados a todas as rotas (sem CSP restritiva por enquanto). */
const CABECALHOS_SEGURANCA = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // O gravador de áudio do currículo usa o microfone; câmera e localização não são usadas
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // O proxy dos rewrites (/api-proxy) corta em 30 s por padrão; o currículo com áudio + IA leva até ~2 min
    proxyTimeout: 150_000,
    // O proxy dos rewrites só repassa o corpo até este limite (padrão 10 MB, sem erro — o upload chegaria cortado).
    // Áudio de até 8 MB + JSON em multipart cabe com folga.
    proxyClientMaxBodySize: "12mb",
  },
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS_SEGURANCA }];
  },
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
