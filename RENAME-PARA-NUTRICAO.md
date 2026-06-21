# Renomear pasta raiz: Nutrir → nutricao

O Cursor mantém a pasta aberta e bloqueia o rename automático.

## No Windows

1. Feche o Cursor (ou abra outro workspace)
2. No Explorer: `Documentos\Nutrir` → renomeie para **`nutricao`**
3. Reabra o projeto em `Documentos\nutricao`

## Na VPS (se ainda estiver ~/nutrir)

```bash
pm2 stop nutrir-web pauli-web 2>/dev/null
mv ~/nutrir ~/nutricao
cd ~/nutricao && pm2 start ecosystem.config.js
pm2 save
```

Atualize nginx se algum path citar `/home/zeedo/nutrir/` (só `cwd` do PM2 importa para o app).
