/** @type {import('next').NextConfig} */
const nextConfig = {
  // links antigos com ?aba= vão para o endereço novo de cada aba (os outros parâmetros seguem junto)
  async redirects() {
    return [
      { source: "/", has: [{ type: "query", key: "aba", value: "stats" }], destination: "/stats", permanent: false },
      { source: "/", has: [{ type: "query", key: "aba", value: "temporada" }], destination: "/temporada", permanent: false },
    ];
  },
};
export default nextConfig;
