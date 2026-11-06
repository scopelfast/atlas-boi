# Atlas Boi

> ERP especializado em **transporte de gado vivo** — multi-tenant, integrado ao DNA Atlas Technologies.

Sistema SaaS para transportadoras e embarcadores que precisam controlar carregamentos, rotas, motoristas, frotas, conta corrente, comissões, cobrança de clientes e DRE por veículo.

## Princípios

| ❌ Não usamos | ✅ Usamos |
|--------------|----------|
| Power BI, Metabase, ferramentas BI externas | **PostgreSQL** — nosso motor de dados, relatórios e inteligência |
| Planilhas soltas | **Código sob medida** — NestJS + Next.js |
| Dependência de terceiros para entender o negócio | **Atlas Intelligence** — IA embarcada que entende transporte de gado |

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [**Plano Completo do Projeto**](docs/PLANO-PROJETO.md) | Arquitetura, modelagem, módulos, roadmap, custos e diferenciais |

## Stack (padrão Atlas)

- **Cérebro:** PostgreSQL 16 — dados, views analíticas, DRE, KPIs, geo, full-text
- **Backend:** NestJS + Prisma
- **Frontend:** Next.js 14 (App Router) + Tailwind + shadcn/ui + Recharts
- **Inteligência:** Atlas Intelligence — IA para NF-e, consultas em linguagem natural, alertas preditivos
- **Mobile:** PWA responsivo (Fase 1) → React Native (Fase 2)

## Status

🟡 **Fase 2 — Transporte** (em andamento · ~75%)

| Fase | Status |
|------|--------|
| Fase 0 — Bootstrap | ✅ Completa |
| Fase 1 — Cadastros | ✅ ~90% (faltam testes unitários) |
| Fase 2 — Transporte | 🟡 Em andamento |
| Fase 3 — Financeiro | ⬜ Placeholder |
| Fase 4 — Relatórios + IA | ⬜ Placeholder |

> Acompanhe o checklist detalhado em [`docs/PLANO-PROJETO.md`](docs/PLANO-PROJETO.md) · §18 Roadmap

## Desenvolvimento local

### Opção A — PostgreSQL local (recomendado)

Você já tem **PostgreSQL 18** na porta **5432**. O `backend/.env` já aponta para `atlas_boi_db`.

```powershell
# Backend
cd backend
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run dev

# Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

### Opção B — Docker (porta 5434)

Requer **Docker Desktop em execução**:

```powershell
docker compose up postgres -d
# Use a URL com porta 5434 no backend/.env (ver comentário no .env.example)
```

- **API:** http://localhost:3004/api/health  
- **Web:** http://localhost:3000  
- **Login demo:** `admin@atlas.local` / `admin123`

---

*Atlas Technologies · Transporte agropecuário com inteligência de negócio*
