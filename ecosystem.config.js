/**
 * PM2 — Nutrir (site Next.js)
 * No VPS: cd ~/nutrir && pm2 start ecosystem.config.js
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
