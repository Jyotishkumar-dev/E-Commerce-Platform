# Shopvibe.store — E-Commerce Platform

> **Shopvibe.store** is a modern, premium, and human-centric full-stack e-commerce platform built for thoughtful shopping.

Technical repository identifier: `e-commerce-platform`

---

## 🏛️ Architecture Overview

The repository is organized as a high-performance monorepo using **pnpm workspaces** and **Turborepo**:

```
e-commerce-platform/
├── apps/                    # Extended workspace apps (future)
├── backend/
│   └── api/                 # Express 5 REST API, Prisma ORM, JWT authentication
├── frontend/
│   └── web/                 # React 19, TypeScript, Vite, TanStack Query, Tailwind tokens
├── packages/
│   └── shared/              # Shared Zod schemas, TypeScript types, and API contracts
├── docs/                    # Architectural specifications and technical documentation
├── docker-compose.yml       # PostgreSQL 16 & Redis 7 services
└── pnpm-workspace.yaml      # Monorepo workspace configuration
```

---

## 🚀 Tech Stack

### Frontend (`@e-commerce-platform/web`)
* **Framework:** React 19, TypeScript, Vite
* **Routing & State:** React Router DOM, TanStack React Query, Zustand
* **Styling & Design Tokens:** Shopvibe Design Tokens (warm canvas, deep charcoal typography, refined borders)
* **Icons & Branding:** Centralized `ShopvibeLogo`, Lucide React

### Backend (`@e-commerce-platform/api`)
* **Runtime:** Node.js, Express 5, TypeScript
* **Database & ORM:** PostgreSQL 16, Prisma ORM
* **Caching & Sessions:** Redis 7, HTTP-only Cookie Refresh Sessions (cryptographically rotated)
* **Security:** Helmet, CORS, bcrypt password hashing, Pino HTTP logger
* **Validation:** Zod schemas

### Shared (`@e-commerce-platform/shared`)
* Cross-cutting TypeScript definitions, Zod validation schemas, and API request/response contracts.

---

## 🛠️ Getting Started

### 1. Prerequisites
* Node.js >= 20.0.0
* pnpm >= 10.0.0
* Docker & Docker Compose

### 2. Environment Setup
```bash
cp backend/api/.env.example backend/api/.env
cp frontend/web/.env.example frontend/web/.env
```

### 3. Start Database & Cache
```bash
docker compose up -d
```

### 4. Install Dependencies & Generate Database Client
```bash
pnpm install
pnpm --filter @e-commerce-platform/api prisma:generate
pnpm --filter @e-commerce-platform/api prisma:migrate
pnpm --filter @e-commerce-platform/api prisma:seed
```

### 5. Start Development Servers
```bash
pnpm dev
```

* **Frontend Web App:** `http://localhost:5173`
* **Backend API Health:** `http://localhost:5000/api/v1/health`

### Demo Credentials (from Seed)
* **Demo Customer/Seller:** `seller@shopvibe.store` / `Password123!`
* **Platform Admin:** `admin@shopvibe.store` / `Password123!`

---

## 🧪 Testing & Quality

### Run Tests
```bash
# Run all tests across monorepo
pnpm test

# Run tests for specific package
pnpm --filter @e-commerce-platform/api test
pnpm --filter @e-commerce-platform/web test
pnpm --filter @e-commerce-platform/shared test

# Run tests with coverage
pnpm --filter @e-commerce-platform/api test:coverage
pnpm --filter @e-commerce-platform/web test:coverage
pnpm --filter @e-commerce-platform/shared test:coverage

# Run E2E tests (frontend only, requires running dev server)
pnpm --filter @e-commerce-platform/web test:e2e
pnpm --filter @e-commerce-platform/web test:e2e:ui
```

### Linting & Type Checking
```bash
# Lint all packages (allows warnings)
pnpm lint

# Strict lint (fails on warnings)
pnpm --filter @e-commerce-platform/web lint:strict
pnpm --filter @e-commerce-platform/api lint
pnpm --filter @e-commerce-platform/shared lint

# Type check all packages
pnpm typecheck

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Quality Gates
```bash
# Run full quality gate for each package (lint + typecheck + test)
pnpm --filter @e-commerce-platform/api quality-gate
pnpm --filter @e-commerce-platform/web quality-gate
pnpm --filter @e-commerce-platform/shared quality-gate
```

### Test Coverage Summary (as of Phase 14)
| Package | Test Files | Tests | Status |
|---------|------------|-------|--------|
| Backend (`@e-commerce-platform/api`) | 22 | 275 | ✅ Passing |
| Frontend (`@e-commerce-platform/web`) | 13 | 93 | ✅ Passing |
| Shared (`@e-commerce-platform/shared`) | 1 | 16 | ✅ Passing |
| **Total** | **36** | **384** | ✅ **All Passing** |

---

## 🎨 Brand Identity

* **Brand Name:** `Shopvibe.store`
* **Tagline:** Shop Better. Live Better.
* **Aesthetic:** Premium, Classy, Modern, Trustworthy, Human, User-Friendly.
