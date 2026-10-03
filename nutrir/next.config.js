/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite validar o build (NEXT_DIST_DIR=.next-check npm run build) sem mexer na
  // pasta .next que o servidor de desenvolvimento esta usando.
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
      // /ifood não está aqui: é uma página própria (app/ifood/page.tsx) com
      // metadados corretos pra preview de link, que redireciona via JS. Um
      // redirect HTTP direto faz o crawler de preview ler os metadados da
      // própria página do iFood, que tem um bug e mostra "undefined".
    ];
  },
};

module.exports = nextConfig;
