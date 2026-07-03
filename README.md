# Nutrição — monorepo

Sites da família Nutrir / Pauli:

| Projeto | Pasta | Porta dev | URL produção |
|---------|-------|-----------|--------------|
| **Nutrir** (marmitas) | `nutrir/` | 3000 | `https://nutrirpicarras.com.br` |
| **Pauli** (nutricionista) | `pauli/` | 3002 | `https://pauli.nutrirpicarras.com.br` |
| **Nootr** | `nootr/` | 3001 | (em desenvolvimento) |

## Estrutura

```
nutricao/
├── nutrir/            # Site da marmitaria (Next.js + API em app/api)
├── pauli/             # Site profissional da nutricionista (Next.js)
├── nootr/             # App de substituições alimentares (Next.js)
│   └── backend/       # API FastAPI (Nootr)
├── supabase/          # Migrations SQL
├── deploy/            # Configs nginx de referência
└── ecosystem.config.js
```

> A pasta raiz chama-se **nutricao** para não confundir com **nutrir/** (site das marmitas).

## Supabase

Projeto **`ocjtzacohamatjbzlind`** — pedidos, clientes e auth do **nutrir/**.

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

[http://localhost:3001](http://localhost:3001)

API (em outro terminal, dentro de `nootr/`):

```bash
cd nootr
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

## VPS (Hetzner + Cloudflare)

### Caminho no servidor

```text
/home/zeedo/nutricao/
```

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

- **nutrirpicarras.com.br** → `127.0.0.1:3001`
- **pauli.nutrirpicarras.com.br** → `127.0.0.1:3002` — ver `deploy/nginx-pauli.conf`

```bash
sudo cp deploy/nginx-pauli.conf /etc/nginx/sites-available/pauli
sudo ln -sf /etc/nginx/sites-available/pauli /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Personalize textos, foto e CRN em `pauli/lib/site.ts`.
