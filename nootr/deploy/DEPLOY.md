# Deploy do Nootr

> **Ainda não implantado.** Este runbook prepara o deploy; aplicá-lo na VPS é um
> passo manual e de maior risco (a VPS `zeedo`/Hetzner é compartilhada com
> nutrir, pauli e um projeto de trading — ver `../../CLAUDE.md`). Nada aqui roda
> sozinho.

## Arquitetura em produção

Diferente de nutrir/pauli (só Next), o Nootr tem **dois processos**:

| Processo   | O que é            | Porta (127.0.0.1) | Host público                          |
|------------|--------------------|-------------------|----------------------------------------|
| nootr-web  | Next.js (start)    | 3003              | nootr.nutrirpicarras.com.br            |
| nootr-api  | FastAPI (uvicorn)  | 8010              | nootr-api.nutrirpicarras.com.br        |

O frontend é **client-side**: o navegador chama a API diretamente. Logo a API
precisa de host público próprio (não basta o Next fazer proxy interno) e o CORS
do backend precisa liberar o domínio do frontend.

Auth e dados ficam no **Supabase** (projeto `wdzzipprerboclayrcvw`, "nootr"),
separado do projeto do Nutrir. RLS por usuário protege tudo; o backend usa só a
anon key + o token do usuário.

## Passos

1. **Código na VPS**: `git pull` em `/home/zeedo/nutricao`.

2. **Frontend**:
   ```bash
   cd /home/zeedo/nutricao/nootr
   npm ci
   # .env.local de produção:
   #   NEXT_PUBLIC_NOOTR_API_URL=https://nootr-api.nutrirpicarras.com.br
   #   NEXT_PUBLIC_SUPABASE_URL=https://wdzzipprerboclayrcvw.supabase.co
   #   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   npm run build
   ```

3. **Backend** (venv próprio):
   ```bash
   cd /home/zeedo/nutricao/nootr
   python3 -m venv .venv
   ./.venv/bin/pip install -r backend/requirements.txt
   # .env de produção (nootr/.env):
   #   SUPABASE_URL=https://wdzzipprerboclayrcvw.supabase.co
   #   SUPABASE_ANON_KEY=<anon key>
   #   EXTRA_CORS_ORIGINS=https://nootr.nutrirpicarras.com.br
   ```

4. **pm2**: adicionar os blocos de `ecosystem.nootr.config.js` ao
   `ecosystem.config.js` da raiz (junto de nutrir-web/pauli-web) e:
   ```bash
   cd /home/zeedo/nutricao
   pm2 restart ecosystem.config.js --only nootr-web,nootr-api
   pm2 save
   ```

5. **nginx**: copiar `nginx-nootr.conf` para `/etc/nginx/sites-available/nootr`,
   ajustar domínios, habilitar e recarregar:
   ```bash
   sudo ln -s /etc/nginx/sites-available/nootr /etc/nginx/sites-enabled/nootr
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d nootr.nutrirpicarras.com.br -d nootr-api.nutrirpicarras.com.br
   ```

6. **DNS**: apontar os dois subdomínios (via Cloudflare) para o IP da VPS.

7. **Supabase Auth**: em produção, ativar confirmação de e-mail com SMTP real,
   ou manter desativada conscientemente. Adicionar o domínio do frontend em
   Authentication → URL Configuration (Site URL / Redirect URLs).

## Checagens pós-deploy

- `pm2 status` mostra nootr-web e nootr-api "online".
- `curl -I https://nootr.nutrirpicarras.com.br` → 200.
- `curl https://nootr-api.nutrirpicarras.com.br/health` → `{"status":"ok"}`.
- Login no site → /dieta carrega a dieta do dia.
