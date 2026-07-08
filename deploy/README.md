# Deploy em produção — kivoni.com.br

Arquitetura do lançamento:

| Peça | Onde | Como |
|---|---|---|
| Front novo (este repo) | **Vercel** | projeto Vercel apontando para a branch de produção |
| API | **Droplet DO** 157.230.2.150 | workflow existente (`deploy-droplet.yml` no lmfit-api) deploya no push para `main`/`develop` |
| Banco | **MongoDB Atlas** | `MONGODB_URI` no env do droplet |
| Front antigo | Vercel (`www.lmfit.com.br`) | continua no projeto/branch antigo até decidir o redirect |

Lojas resolvem por subdomínio: `<slug>.kivoni.com.br` (ex.: `lmfit.kivoni.com.br`).
A resolução vive em `src/middleware.ts` + `src/lib/tenantSlug.ts`.

## 1. Projeto Vercel (front novo)

1. Importar o repo `lmfit-web` na Vercel (ou usar o projeto existente com outra branch de produção).
2. **Production Branch**: `main` (o merge de `feature/kivo-platform` → `main` é o momento do launch).
3. **Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_API_URL=https://api.kivoni.com.br`
4. **Domains** do projeto: `kivoni.com.br` e `*.kivoni.com.br` (wildcard).
   - Wildcard na Vercel exige apontar os **nameservers do domínio para a Vercel**, OU criar `CNAME *` → `cname.vercel-dns.com` no DNS atual.
5. Validar primeiro com o **preview deploy** da branch `feature/kivo-platform` — o CORS da API já aceita `*.vercel.app`.

## 2. DNS (no registrar do kivoni.com.br)

| Registro | Nome | Valor |
|---|---|---|
| A ou ALIAS | `@` | Vercel (76.76.21.21) ou conforme painel Vercel |
| CNAME | `*` | `cname.vercel-dns.com` |
| A | `api` | `157.230.2.150` |

## 3. api.kivoni.com.br no droplet

SSH no droplet (`root@157.230.2.150`) e:

```nginx
# /etc/nginx/sites-available/api.kivoni.com.br
server {
    server_name api.kivoni.com.br;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    listen 80;
}
```

```bash
ln -s /etc/nginx/sites-available/api.kivoni.com.br /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.kivoni.com.br   # HTTP-01, sem wildcard
```

## 4. Env da API no droplet (`/opt/kivoni-api`)

Editar o `.env`/compose env e reiniciar:

```env
NODE_ENV=production
MONGODB_URI=<connection string do Atlas>
WEB_ORIGIN=https://kivoni.com.br
WEB_ORIGINS=https://www.lmfit.com.br
# NÃO definir SEED_DEMO_DATA em produção
# SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD só se quiser seed de admin (senão é ignorado)
```

O CORS da API já aceita `*.kivoni.com.br`, `*.lmfit.com.br` e `*.vercel.app` por regex.

## 5. Migração dos dados LMFit (ANTES do merge!)

No repo `lmfit-api`:

```bash
# 1. Dry-run (nada é gravado):
SOURCE_URI='mongodb+srv://...' node scripts/migrate-lmfit-to-prod.js

# 2. Backup:
mongodump --uri="$SOURCE_URI" --out=backup-$(date +%Y%m%d)

# 3. Aplicar:
SOURCE_URI='mongodb+srv://...' node scripts/migrate-lmfit-to-prod.js --apply
```

O script: cria/ajusta o tenant `lmfit` (plano **enterprise**), carimba `tenantId`
em todos os documentos sem tenant, nunca deleta nada, e é idempotente.

## 6. Ordem do launch

1. Migração `--apply` concluída no Atlas ✅
2. Env do droplet apontando para o Atlas ✅
3. Merge `feature/kivo-platform` → `main` no **lmfit-api** (deploya a API nova)
4. Merge `feature/kivo-platform` → `main` no **lmfit-web** (Vercel deploya o front novo)
5. Verificar:
   ```bash
   BASE_URL=https://api.kivoni.com.br node scripts/health-check.js
   curl -H "Origin: https://lmfit.kivoni.com.br" -I https://api.kivoni.com.br/health
   ```
6. Abrir `https://lmfit.kivoni.com.br` → branding LMFit, login, dados migrados
7. Conferir que `https://www.lmfit.com.br` (antigo) continua funcionando

## Pendências conhecidas

- Apex `lmfit.com.br` (sem www) não resolve — configurar redirect no registrar/Vercel.
- Mobile: builds de loja via `eas build --profile production` (bundle IDs e
  `EXPO_PUBLIC_API_URL` já configurados em `app.json`/`eas.json` do lmfit-mobile).
