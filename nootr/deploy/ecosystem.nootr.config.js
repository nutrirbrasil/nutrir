// Entradas pm2 do Nootr (frontend Next + backend FastAPI).
//
// NÃO é aplicado automaticamente. Duas formas de usar na VPS:
//   (a) copiar estes dois blocos para o `apps` do ecosystem.config.js da raiz
//       (junto de nutrir-web/pauli-web) e subir com
//       `pm2 restart ecosystem.config.js --only nootr-web,nootr-api`; ou
//   (b) rodar este arquivo isolado: `pm2 start deploy/ecosystem.nootr.config.js`.
//
// Portas escolhidas para NÃO colidir com o que já roda na VPS:
//   3000 = projeto zeedo (trading) | 3001 = nutrir prod | 3002 = pauli
//   -> nootr-web usa 3003, nootr-api usa 8010.
// Ambos ligam só em 127.0.0.1; o nginx termina TLS e faz o proxy (ver nginx-nootr.conf).

module.exports = {
  apps: [
    {
      name: "nootr-web",
      cwd: "/home/zeedo/nutricao/nootr",
      script: "npm",
      args: "run start -- -H 127.0.0.1 -p 3003",
      env: { NODE_ENV: "production" },
    },
    {
      name: "nootr-api",
      cwd: "/home/zeedo/nutricao/nootr",
      // Usa o Python do venv do projeto (ver DEPLOY.md: python3 -m venv .venv).
      script: "./.venv/bin/uvicorn",
      args: "backend.app.main:app --host 127.0.0.1 --port 8010",
      interpreter: "none", // 'script' já é o executável do uvicorn
    },
  ],
};
