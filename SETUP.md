# AI Smart Commerce setup

## Included stack

- **Web:** React 19, TypeScript, Vite, React Router, TanStack Query, Zustand, Axios
- **API:** Node.js, Express, Prisma, PostgreSQL, Redis, Zod, Pino
- **Shared contracts:** Zod schemas and inferred TypeScript types
- **Tooling:** pnpm workspaces, Turborepo, Docker Compose, Prettier

## Start locally

```sh
cp backend/api/.env.example backend/api/.env
cp frontend/web/.env.example frontend/web/.env
docker compose up -d
pnpm install
pnpm --filter @smart-commerce/api prisma:generate
pnpm --filter @smart-commerce/api prisma:migrate
pnpm --filter @smart-commerce/api prisma:seed
pnpm dev
```

Web: `http://localhost:5173` · API health: `http://localhost:5000/api/v1/health`

The seed creates a demo seller and an admin account:
`admin@smartcommerce.local` / `Password123!`.
