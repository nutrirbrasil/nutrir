/**
 * PM2 — Nutrir (site Next.js)
 *
 * VPS:
 *   1. Variáveis em ~/nutrir/nutrir/.env.local (NÃO use .env aqui)
 *   2. cd ~/nutrir/nutrir && npm run build   (obrigatório após mudar NEXT_PUBLIC_*)
 *   3. cd ~/nutrir && pm2 start ecosystem.config.js
 *
 * Ajuste "cwd" se o caminho do projeto for outro.
 */
module.exports = {
  apps: [
    {
      name: "nutrir-web",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      cwd: "/home/zeedo/nutrir/nutrir",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
