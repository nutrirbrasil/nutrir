# Nutrição — monorepo

Monorepo com os produtos da família Nutrir / Pauli:

| Projeto | Pasta | Porta dev | URL produção |
|---------|-------|-----------|--------------|
| **Nutrir** (marmitas) | `nutrir/` | 3000 | `https://nutrirpicarras.com.br` |
| **Pauli** (nutricionista) | `pauli/` | 3002 | `https://pauli.nutrirpicarras.com.br` |
| **Nootr** | `nootr/` | 3001 | (futuro) |
| **API** | `backend/` | 8000 | FastAPI legado |

## Estrutura

```
nutricao/
├── nutrir/            # Site da marmitaria (Next.js)
├── pauli/             # Site profissional da nutricionista (Next.js)
├── nootr/             # App de substituições alimentares
├── backend/           # API FastAPI
├── supabase/          # Migrations SQL
├── deploy/            # Configs nginx de referência
└── ecosystem.config.js
```

> A pasta raiz chama-se **nutricao** para não confundir com **nutrir/** (site das marmitas).

## Supabase (MCP)

Projeto **`ocjtzacohamatjbzlind`** — usado pelo site **nutrir/** (pedidos e auth).

Credenciais: `nutrir/.env.local`

## Desenvolvimento local

### Nutrir (marmitas)

```bash
cd nutrir
cp .env.example .env.local
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)

### Pauli (nutricionista)

```bash
cd pauli
cp .env.example .env.local
npm install
npm run dev
```

[http://localhost:3002](http://localhost:3002)

### Nootr

```bash
cd nootr
cp .env.example .env.local
npm install
npm run dev
```

## VPS (Hetzner + Cloudflare)

### Caminho no servidor

```text
/home/zeedo/nutricao/
```

Se ainda estiver em `~/nutrir`, renomeie:

```bash
mv ~/nutrir ~/nutricao
pm2 delete nutrir-web 2>/dev/null
cd ~/nutricao && pm2 start ecosystem.config.js
pm2 save
```

Atualize os `cwd` no nginx se referenciavam `/home/zeedo/nutrir/`.

### Deploy Nutrir

```bash
nano ~/nutricao/nutrir/.env.local
cd ~/nutricao/nutrir && npm run build && pm2 restart nutrir-web
```

| Variável | Valor |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://nutrirpicarras.com.br` |

### Deploy Pauli

```bash
cp ~/nutricao/pauli/.env.example ~/nutricao/pauli/.env.local
cd ~/nutricao/pauli && npm install && npm run build
pm2 restart pauli-web
```

| Variável | Valor |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://pauli.nutrirpicarras.com.br` |

### DNS (Cloudflare)

| Type | Name | Content |
|------|------|---------|
| A | `@` | IP da VPS |
| A | `www` | IP da VPS |
| A | `pauli` | IP da VPS |

### Nginx

- **nutrirpicarras.com.br** → `127.0.0.1:3001` (site existente)
- **pauli.nutrirpicarras.com.br** → `127.0.0.1:3002` — ver `deploy/nginx-pauli.conf`

```bash
sudo cp deploy/nginx-pauli.conf /etc/nginx/sites-available/pauli
sudo ln -sf /etc/nginx/sites-available/pauli /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Personalize textos, foto e CRN em `pauli/lib/site.ts`.
