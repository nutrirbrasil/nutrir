/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/cardapio", destination: "/", permanent: true },
      { source: "/pedido", destination: "/agendar", permanent: true },
      { source: "/checkout/sucesso", destination: "/checkout/obrigado", permanent: false },
      { source: "/checkout/pendente", destination: "/checkout/obrigado", permanent: false },
      { source: "/checkout/pix/obrigado", destination: "/checkout/obrigado", permanent: false },
    ];
  },
};

module.exports = nextConfig;
