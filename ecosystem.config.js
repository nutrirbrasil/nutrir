/**
 * PM2 — monorepo nutricao
 *
 * VPS:
 *   1. Clone em ~/nutricao (não ~/nutrir)
 *   2. nutrir/.env.local e pauli/.env.local
 *   3. cd nutricao/nutrir && npm run build
 *   4. cd nutricao/pauli && npm run build
 *   5. cd ~/nutricao && pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: "nutrir-web",
      script: "node_modules/.bin/next",
      args: "start -p 3001 -H 127.0.0.1",
      cwd: "/home/zeedo/nutricao/nutrir",
      env: { NODE_ENV: "production" },
    },
    {
      name: "pauli-web",
      script: "node_modules/.bin/next",
      args: "start -p 3002 -H 127.0.0.1",
      cwd: "/home/zeedo/nutricao/pauli",
      env: { NODE_ENV: "production" },
    },
  ],
};
