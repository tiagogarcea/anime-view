const prod = process.env.NODE_ENV === "production";

/**
 * Cabeçalhos de segurança em todas as páginas. Capas vêm de vários sites (MyAnimeList, Google), então
 * img-src aceita qualquer https; o resto fica restrito ao próprio site. 'unsafe-inline' é necessário
 * porque o Next e o app/layout.tsx usam scripts embutidos (sem nonce); 'unsafe-eval' só no desenvolvimento.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${prod ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const seguranca = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: seguranca }];
  },
  // links antigos com ?aba= vão para o endereço novo de cada aba (os outros parâmetros seguem junto)
  async redirects() {
    return [
      { source: "/", has: [{ type: "query", key: "aba", value: "stats" }], destination: "/stats", permanent: false },
      { source: "/", has: [{ type: "query", key: "aba", value: "temporada" }], destination: "/temporada", permanent: false },
    ];
  },
};
export default nextConfig;
