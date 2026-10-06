# Shopvibe.store — Local Development Setup

## Included Stack

- **Web:** React 19, TypeScript, Vite, React Router, TanStack Query, Zustand, Axios
- **API:** Node.js, Express, Prisma, PostgreSQL, Redis, Zod, Pino
- **Shared Contracts:** Zod schemas and inferred TypeScript types
- **Tooling:** pnpm workspaces, Turborepo, Docker Compose, Prettier

## Start Locally

```sh
cp backend/api/.env.example backend/api/.env
cp frontend/web/.env.example frontend/web/.env
docker compose up -d
pnpm install
pnpm --filter @e-commerce-platform/api prisma:generate
pnpm --filter @e-commerce-platform/api prisma:migrate
pnpm --filter @e-commerce-platform/api prisma:seed
pnpm dev
```

> **Note:** If you previously ran an older local Postgres container with different
> credentials, remove the stale volume once before starting:
> `docker compose down -v`.
> This deletes all local database data, so only do this when you can reseed.

Web: `http://localhost:5173` · API health: `http://localhost:5000/api/v1/health`

The seed creates demo accounts:
- Seller: `seller@shopvibe.store` / `Password123!`
- Admin: `admin@shopvibe.store` / `Password123!`
