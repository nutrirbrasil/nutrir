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
      {
        source: "/review",
        destination: "https://g.page/r/CXJ5WKkcHYgMEAI/review",
        permanent: false,
      },
      {
        source: "/ifood",
        destination:
          "https://www.ifood.com.br/delivery/balneario-picarras-sc/nutrir-picarras---marmitas-saudaveis-centro/8bf60ae3-a177-49fb-aefc-8e033cf4ea82",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
