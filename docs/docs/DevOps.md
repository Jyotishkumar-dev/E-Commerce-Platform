# Phase 6 — DevOps & Infrastructure Architecture
## AI-Powered Smart Commerce Platform

**Author Role:** Senior DevOps / Platform Architect (Amazon / Shopify / Flipkart Infrastructure Standards)
**Scope:** End-to-end infrastructure, CI/CD, containerization, deployment, observability, security, and disaster recovery for the AI-Powered Smart Commerce Platform.

---

## Table of Contents

1. Environment Architecture
2. Environment Variables Matrix
3. Docker Architecture
4. Multi-stage Dockerfile Explanation
5. Docker Compose Architecture
6. GitHub Actions CI/CD Pipeline
7. Git Branching Strategy
8. Conventional Commit Standards
9. Deployment Pipeline (Development → Staging → Production)
10. Railway/Render Backend Deployment
11. Vercel Frontend Deployment
12. PostgreSQL & Redis Infrastructure
13. Reverse Proxy / Nginx Architecture
14. Monitoring & Observability
15. Logging Pipeline
16. Backup & Disaster Recovery
17. SSL, HTTPS & Security Hardening
18. Secrets Management
19. Infrastructure Scalability Strategy
20. Production Readiness Checklist
21. Infrastructure Summary Diagram

---

## 1. Environment Architecture

The platform runs across **four isolated environments**, each with its own database, secrets, and deployment target. No environment shares credentials, and no environment writes to another environment's data store.

| Environment | Purpose | Backend Host | Frontend Host | Database |
|---|---|---|---|---|
| **Local** | Developer machine | Docker Compose | Vite Dev Server | Local Postgres container |
| **Development (dev)** | Integration testing, feature previews | Railway (dev service) | Vercel Preview | Railway Postgres (dev) |
| **Staging** | Pre-production validation, QA sign-off | Railway (staging service) | Vercel Preview (staging branch) | Railway Postgres (staging) |
| **Production** | Live customer traffic | Railway (prod service) / Render fallback | Vercel Production | Railway Postgres (prod, HA) |

### Environment Isolation Diagram

```mermaid
flowchart TB
    subgraph Local["Local Environment"]
        L1[Docker Compose Stack]
        L2[(Local Postgres)]
        L3[(Local Redis)]
    end

    subgraph Dev["Development Environment"]
        D1[Railway Backend - dev]
        D2[Vercel Preview - dev]
        D3[(Postgres - dev)]
        D4[(Redis - dev)]
    end

    subgraph Staging["Staging Environment"]
        S1[Railway Backend - staging]
        S2[Vercel Preview - staging]
        S3[(Postgres - staging)]
        S4[(Redis - staging)]
    end

    subgraph Prod["Production Environment"]
        P1[Railway Backend - prod - HA]
        P2[Vercel Production]
        P3[(Postgres - prod - HA + Replica)]
        P4[(Redis - prod - Persistent)]
    end

    Local -.promote via PR.-> Dev
    Dev -.promote via merge.-> Staging
    Staging -.promote via release tag.-> Prod
```

### Environment Promotion Rules

- **Local → Dev:** any pushed feature branch triggers a Vercel Preview + Railway dev deploy.
- **Dev → Staging:** only merges into `develop` trigger a staging deploy.
- **Staging → Production:** only annotated release tags (`v1.x.x`) merged into `main` trigger a production deploy, gated by manual approval in GitHub Actions.
- Each environment has its own `.env` file, never committed, and its own Prisma migration history tracked independently.

---

## 2. Environment Variables Matrix

Environment variables are grouped by domain and scoped per environment. Production secrets are never present in `.env.example`; only variable **names** are documented there.

### 2.1 Backend Environment Variables

| Variable | Local | Dev | Staging | Production | Description |
|---|---|---|---|---|---|
| `NODE_ENV` | development | development | staging | production | Runtime mode |
| `PORT` | 5000 | 5000 | 5000 | 5000 | Express listen port |
| `DATABASE_URL` | local pg | Railway dev pg | Railway staging pg | Railway prod pg (pooled) | Prisma connection string |
| `DIRECT_URL` | local pg | Railway dev pg | Railway staging pg | Railway prod pg (direct) | Prisma migration connection |
| `REDIS_URL` | local redis | Railway dev redis | Railway staging redis | Railway prod redis | Cache/session/queue store |
| `JWT_ACCESS_SECRET` | dev secret | dev secret | staging secret | vaulted secret | Access token signing key |
| `JWT_REFRESH_SECRET` | dev secret | dev secret | staging secret | vaulted secret | Refresh token signing key |
| `JWT_ACCESS_EXPIRY` | 15m | 15m | 15m | 15m | Access token TTL |
| `JWT_REFRESH_EXPIRY` | 7d | 7d | 7d | 30d | Refresh token TTL |
| `CORS_ORIGIN` | localhost:5173 | dev.vercel.app | staging.vercel.app | app domain | Allowed origin |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | dev key | dev key | staging key | prod key (rotated) | AI provider key |
| `RAZORPAY_KEY_ID` / `STRIPE_KEY` | test mode | test mode | test mode | live mode | Payment gateway |
| `CLOUDINARY_URL` / `S3_*` | dev bucket | dev bucket | staging bucket | prod bucket | Media storage |
| `SMTP_HOST/USER/PASS` | mailtrap | mailtrap | mailtrap | transactional (SES/SendGrid) | Email delivery |
| `SENTRY_DSN` | disabled | enabled | enabled | enabled | Error tracking |
| `LOG_LEVEL` | debug | debug | info | warn | Winston/Pino log threshold |
| `RATE_LIMIT_WINDOW_MS` | 900000 | 900000 | 900000 | 900000 | Rate limiter window |
| `RATE_LIMIT_MAX` | 1000 | 1000 | 300 | 100 | Requests per window |

### 2.2 Frontend Environment Variables

| Variable | Local | Dev | Staging | Production |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | localhost:5000/api | dev API URL | staging API URL | prod API URL |
| `VITE_SOCKET_URL` | localhost:5000 | dev socket URL | staging socket URL | prod socket URL |
| `VITE_SENTRY_DSN` | disabled | enabled | enabled | enabled |
| `VITE_RAZORPAY_KEY` | test key | test key | test key | live key |
| `VITE_APP_ENV` | local | development | staging | production |

### Secret Flow Diagram

```mermaid
flowchart LR
    A[.env.example - committed, names only] --> B[Developer local .env - gitignored]
    C[GitHub Encrypted Secrets] --> D[GitHub Actions Runner]
    D --> E[Railway Environment Variables]
    D --> F[Vercel Environment Variables]
    E --> G[Backend Runtime]
    F --> H[Frontend Build]
```

---

## 3. Docker Architecture

The platform is fully containerized for local parity with production. Each service — backend, frontend, database, cache — runs as an isolated container orchestrated via Docker Compose locally, and via Railway's native container runtime in cloud environments.

### 3.1 Container Topology

```mermaid
flowchart TB
    subgraph DockerHost["Docker Host / Container Runtime"]
        NGX[nginx - reverse proxy]
        BE[backend container - Node.js/Express]
        FE[frontend container - static build served via nginx]
        PG[(postgres container)]
        RD[(redis container)]
        WK[worker container - BullMQ jobs]
    end

    Client((Client Browser)) --> NGX
    NGX --> FE
    NGX --> BE
    BE --> PG
    BE --> RD
    WK --> RD
    WK --> PG
```

### 3.2 Image Design Principles

- **Minimal base images**: `node:20-alpine` for backend and worker to reduce attack surface and image size.
- **Non-root execution**: every container runs as a dedicated unprivileged user (`appuser`), never root.
- **Immutable builds**: each image is tagged with the Git SHA, never `latest`, for reproducible deploys and instant rollback.
- **Layer caching**: dependency installation is a separate layer from source copy, so `npm ci` is cached across builds unless `package-lock.json` changes.
- **Single responsibility per container**: backend, worker, and frontend never share a container, even though they share a codebase (monorepo).

---

## 4. Multi-stage Dockerfile Explanation

### 4.1 Backend Dockerfile

```dockerfile
# ---------- Stage 1: Dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Stage 2: Build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Stage 3: Production Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

USER appuser
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node ./dist/healthcheck.js || exit 1

CMD ["node", "dist/server.js"]
```

### 4.2 Why Multi-stage Builds

| Stage | Purpose | Discarded in Final Image? |
|---|---|---|
| `deps` | Installs only production dependencies | Copied selectively |
| `builder` | Installs dev dependencies, compiles TypeScript, generates Prisma client | Fully discarded |
| `runner` | Final minimal image with only compiled output + prod deps | This is what ships |

**Result:** final image size drops from roughly 1.2 GB (naive single-stage build with all devDependencies) to under 180 MB, and the image contains no TypeScript source, no test files, and no build tooling — reducing both attack surface and cold-start time.

### 4.3 Frontend Dockerfile

```dockerfile
# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---------- Stage 2: Serve ----------
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

The frontend is compiled once into static assets and served by `nginx:alpine`, never by a Node.js process in production — this removes an entire runtime dependency from the serving path and lets nginx handle gzip, caching headers, and static-file concurrency far more efficiently than Express ever could.

---

## 5. Docker Compose Architecture

`docker-compose.yml` orchestrates the full local stack so a new developer can run `docker compose up` and have parity with production topology within minutes.

```yaml
version: "3.9"

services:
  backend:
    build:
      context: ./backend
      target: builder
    ports:
      - "5000:5000"
    env_file: ./backend/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - commerce-net

  worker:
    build:
      context: ./backend
      target: builder
    command: ["node", "dist/worker.js"]
    env_file: ./backend/.env
    depends_on:
      - redis
      - postgres
    networks:
      - commerce-net

  frontend:
    build:
      context: ./frontend
    ports:
      - "5173:5173"
    env_file: ./frontend/.env
    networks:
      - commerce-net

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: commerce
      POSTGRES_PASSWORD: commerce
      POSTGRES_DB: smart_commerce
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U commerce"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - commerce-net

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - commerce-net

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
      - frontend
    networks:
      - commerce-net

volumes:
  pgdata:
  redisdata:

networks:
  commerce-net:
    driver: bridge
```

### Compose Service Dependency Graph

```mermaid
flowchart LR
    NGX[nginx] --> BE[backend]
    NGX --> FE[frontend]
    BE --> PG[(postgres)]
    BE --> RD[(redis)]
    WK[worker] --> PG
    WK --> RD
    BE -.healthcheck.-> PG
    BE -.healthcheck.-> RD
```

Healthchecks on `postgres` and `redis` gate backend startup via `depends_on: condition: service_healthy`, preventing the classic race condition where the backend boots and crashes because the database isn't accepting connections yet.

---

## 6. GitHub Actions CI/CD Pipeline

The pipeline runs on every push and pull request, with escalating strictness as code moves toward `main`.

### 6.1 Pipeline Diagram

```mermaid
flowchart TD
    A[Push / PR] --> B[Lint & Format Check]
    B --> C[Type Check - tsc]
    C --> D[Unit Tests - Jest/Vitest]
    D --> E[Integration Tests - Supertest + Test DB]
    E --> F[Build Backend Image]
    F --> G[Build Frontend Image]
    G --> H[Security Scan - npm audit + Trivy]
    H --> I{Branch?}
    I -->|feature/*| J[Deploy Preview - Vercel + Railway dev]
    I -->|develop| K[Deploy Staging]
    I -->|main + tag| L[Manual Approval Gate]
    L --> M[Deploy Production]
    M --> N[Run Smoke Tests]
    N --> O[Notify Slack/Discord]
```

### 6.2 `ci.yml` — Continuous Integration

```yaml
name: CI

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop, main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Run Prisma migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

      - name: Security audit
        run: npm audit --audit-level=high

      - name: Build backend
        run: npm run build

  docker-build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build backend image
        run: docker build -t smart-commerce-backend:${{ github.sha }} ./backend

      - name: Trivy vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: smart-commerce-backend:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: 1
```

### 6.3 `deploy-production.yml` — Continuous Deployment

```yaml
name: Deploy Production

on:
  push:
    tags:
      - "v*.*.*"

jobs:
  approval:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Await manual approval
        run: echo "Approved via GitHub Environment protection rule"

  deploy-backend:
    needs: approval
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway (production)
        run: |
          curl -fsSL https://railway.app/install.sh | sh
          railway up --service backend-prod
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PROD }}

  deploy-frontend:
    needs: approval
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel (production)
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}

  smoke-test:
    needs: [deploy-backend, deploy-frontend]
    runs-on: ubuntu-latest
    steps:
      - name: Hit health endpoint
        run: |
          curl --fail https://api.smartcommerce.app/health
          curl --fail https://smartcommerce.app

  notify:
    needs: smoke-test
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack
        run: echo "Production deploy successful — notifying team"
```

**Environment Protection Rules** on GitHub (`production` environment) require at least one designated reviewer to approve the workflow run before `deploy-backend` and `deploy-frontend` execute — this is the manual gate between staging and live traffic.

---

## 7. Git Branching Strategy

The platform follows a **trunk-based GitFlow hybrid**, optimized for a solo/small-team SaaS build with a clean audit trail.

```mermaid
gitGraph
   commit id: "init"
   branch develop
   checkout develop
   commit id: "setup ci"
   branch feature/product-catalog
   checkout feature/product-catalog
   commit id: "add catalog api"
   commit id: "add catalog tests"
   checkout develop
   merge feature/product-catalog
   branch feature/ai-recommendations
   checkout feature/ai-recommendations
   commit id: "embed pipeline"
   checkout develop
   merge feature/ai-recommendations
   branch release/v1.0.0
   checkout release/v1.0.0
   commit id: "version bump"
   checkout main
   merge release/v1.0.0 tag: "v1.0.0"
   checkout develop
   merge main
```

### Branch Roles

| Branch | Purpose | Protection Rules |
|---|---|---|
| `main` | Production-ready code only | Requires PR + passing CI + 1 approval, no direct pushes |
| `develop` | Integration branch for staging | Requires PR + passing CI |
| `feature/*` | New features, branched from `develop` | Deletable after merge |
| `fix/*` | Bug fixes, branched from `develop` or `main` (hotfix) | Deletable after merge |
| `release/*` | Version freeze, final QA before tagging | Merged into both `main` and `develop` |
| `hotfix/*` | Emergency production patch, branched from `main` | Merged into both `main` and `develop` immediately |

**Rule:** nothing is ever deployed to production from a branch that isn't `main`, and `main` only ever receives code via a reviewed, CI-passed pull request from `release/*` or `hotfix/*`.

---

## 8. Conventional Commit Standards

All commits follow the [Conventional Commits](https://www.conventionalcommits.org/) specification, enforced via a `commitlint` Husky pre-commit hook.

### 8.1 Commit Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### 8.2 Allowed Types

| Type | Use Case |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `docs` | Documentation only |
| `chore` | Tooling, dependency bumps, config |
| `ci` | CI/CD pipeline changes |
| `build` | Build system or Docker changes |
| `revert` | Reverts a previous commit |

### 8.3 Examples

```
feat(catalog): add pgvector-based product similarity search
fix(auth): correct refresh token rotation race condition
refactor(orders): extract payment reconciliation into service layer
perf(cache): add Redis caching to product listing endpoint
ci(pipeline): add Trivy scan stage to docker-build job
```

### 8.4 Enforcement

```javascript
// commitlint.config.js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "perf", "test", "docs", "chore", "ci", "build", "revert"],
    ],
    "subject-case": [2, "always", "lower-case"],
  },
};
```

Commit type also drives **automated semantic versioning**: `fix` bumps patch, `feat` bumps minor, and a `BREAKING CHANGE:` footer bumps major — release notes are generated automatically from commit history via `semantic-release`.

---

## 9. Deployment Pipeline (Development → Staging → Production)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant CI as GitHub Actions
    participant Rail as Railway
    participant Verc as Vercel
    participant QA as QA/Reviewer

    Dev->>GH: Push feature branch
    GH->>CI: Trigger CI (lint, test, build)
    CI->>Rail: Deploy dev preview
    CI->>Verc: Deploy Vercel preview
    Dev->>GH: Open PR into develop
    CI->>GH: Report checks passing
    QA->>GH: Review + approve
    GH->>GH: Merge into develop
    CI->>Rail: Deploy staging
    CI->>Verc: Deploy staging preview
    QA->>QA: Manual QA sign-off on staging
    Dev->>GH: Cut release branch, tag v1.x.x
    GH->>GH: Merge release into main
    CI->>QA: Await manual production approval
    QA->>CI: Approve
    CI->>Rail: Deploy production (backend)
    CI->>Verc: Deploy production (frontend)
    CI->>CI: Run smoke tests
    CI->>Dev: Notify success/failure
```

### Rollback Strategy

- Every Railway deploy is tagged with the Git SHA; a failed smoke test triggers automatic rollback to the previous healthy deployment via `railway rollback`.
- Vercel retains every production deployment as an immutable, individually-addressable URL — promoting a previous deployment back to production is a single atomic alias swap, typically under 5 seconds.
- Database migrations are always additive and backward-compatible within a release (expand/contract pattern) so a code rollback never requires a simultaneous destructive schema rollback.

---

## 10. Railway/Render Backend Deployment

### 10.1 Why Railway (Primary)

Railway is used as the primary backend host for its native Docker support, built-in Postgres/Redis provisioning, environment-scoped deploys, and zero-config horizontal scaling.

### 10.2 Railway Service Topology

```mermaid
flowchart TB
    subgraph Railway["Railway Project: smart-commerce"]
        direction TB
        SVC1[Service: backend-api]
        SVC2[Service: backend-worker]
        SVC3[(Plugin: Postgres)]
        SVC4[(Plugin: Redis)]
    end

    SVC1 --> SVC3
    SVC1 --> SVC4
    SVC2 --> SVC3
    SVC2 --> SVC4
    LB[Railway Edge/Load Balancer] --> SVC1
```

### 10.3 `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5,
    "numReplicas": 2
  }
}
```

### 10.4 Render as Failover/DR Host

Render is configured as a **cold-standby** target with an identical Docker build, deployed manually or via a scripted `render.yaml` blueprint if Railway experiences an extended outage. DNS failover via a low-TTL CNAME allows redirecting `api.smartcommerce.app` to Render within minutes.

```yaml
# render.yaml (standby blueprint)
services:
  - type: web
    name: smart-commerce-backend-dr
    env: docker
    dockerfilePath: ./backend/Dockerfile
    plan: standard
    healthCheckPath: /health
    envVars:
      - fromGroup: smart-commerce-prod-secrets
```

---

## 11. Vercel Frontend Deployment

### 11.1 Deployment Model

Vercel builds and deploys the React/Vite frontend on every push, generating a unique immutable preview URL per branch/PR, and aliasing `main` deployments to the production domain.

```mermaid
flowchart LR
    A[Git Push] --> B[Vercel Build - vite build]
    B --> C[Static Assets to Edge Network]
    C --> D{Branch}
    D -->|feature/*| E[Preview URL]
    D -->|develop| F[staging.smartcommerce.app]
    D -->|main| G[smartcommerce.app - Production Alias]
```

### 11.2 `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

### 11.3 Edge Network Benefits

- Static assets served from Vercel's global CDN with near-zero latency regardless of user location.
- Automatic Brotli/gzip compression and HTTP/2 by default.
- SPA fallback rewrite (`/(.*)` → `/index.html`) ensures client-side React Router routes resolve correctly on hard refresh.

---

## 12. PostgreSQL & Redis Infrastructure

### 12.1 PostgreSQL Topology (Production)

```mermaid
flowchart TB
    APP[Backend Instances] --> PGB[PgBouncer - Connection Pooler]
    PGB --> PRIMARY[(Postgres Primary)]
    PRIMARY --> REPLICA[(Read Replica)]
    PRIMARY --> WAL[WAL Archiving]
    WAL --> BACKUP[(S3 - Daily Snapshots)]
    APP -.read-heavy queries.-> REPLICA
```

- **Connection pooling** via PgBouncer (transaction mode) sits between the application and Postgres to prevent connection exhaustion under Railway's managed Postgres connection limits.
- **Read replica** offloads reporting/analytics and AI-recommendation read queries from the primary, keeping write latency low on the transactional path (orders, payments).
- **WAL archiving** feeds continuous backups to S3-compatible object storage for point-in-time recovery.

### 12.2 Redis Usage Map

| Use Case | Redis Data Structure | TTL |
|---|---|---|
| Session/refresh token blocklist | String (key-value) | Matches token expiry |
| Product listing cache | String (JSON) | 5 minutes |
| Rate limiting counters | Sorted Set / String | Sliding window |
| BullMQ job queues (emails, AI embedding jobs, order processing) | List/Stream (BullMQ internal) | Job-lifetime |
| Real-time cart state | Hash | 24 hours |
| Pub/Sub for Socket.IO scaling | Pub/Sub channel | N/A |

```mermaid
flowchart LR
    BE[Backend API] --> RD[(Redis)]
    RD --> C1[Cache Layer]
    RD --> C2[Rate Limiter]
    RD --> C3[BullMQ Queues]
    RD --> C4[Socket.IO Adapter - Pub/Sub]
    WK[Worker Processes] --> C3
```

Redis is deployed with **AOF persistence enabled** in production (`appendonly yes`) so queued jobs and cart state survive a Redis restart, unlike a pure in-memory cache configuration.

---

## 13. Reverse Proxy / Nginx Architecture

Nginx sits at the edge of the self-hosted Docker stack (used in the Compose-based local/self-hosted deployment path) handling TLS termination, static asset serving, and reverse proxying to the backend.

```mermaid
flowchart TB
    Client((Client)) -->|HTTPS 443| NGX[Nginx]
    NGX -->|/api/*| BE[Backend :5000]
    NGX -->|/socket.io/*| BE
    NGX -->|/*| FE[Frontend static files]
    NGX -->|rate limit zone| RL[req/s throttling]
```

### `nginx.conf`

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    listen 80;
    server_name smartcommerce.app;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name smartcommerce.app;

    ssl_certificate     /etc/letsencrypt/live/smartcommerce.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartcommerce.app/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

In managed deployments (Railway + Vercel), this reverse-proxy layer is subsumed by Railway's and Vercel's own edge infrastructure, but the same Nginx config is retained for self-hosted/VPS disaster-recovery deployments so the platform is never locked into a single provider.

---

## 14. Monitoring & Observability

### 14.1 Observability Stack

```mermaid
flowchart TB
    APP[Backend Services] -->|metrics| PROM[Prometheus]
    APP -->|errors/traces| SENTRY[Sentry]
    APP -->|uptime pings| BSTACK[Better Stack]
    PROM --> GRAF[Grafana Dashboards]
    BSTACK -->|downtime alert| SLACK[Slack/Discord]
    SENTRY -->|error alert| SLACK
    GRAF -->|threshold alert| SLACK
```

| Tool | Responsibility |
|---|---|
| **Prometheus** | Scrapes `/metrics` endpoint (via `prom-client`) for request latency, throughput, error rate, event loop lag, DB pool utilization |
| **Grafana** | Visualizes Prometheus metrics — dashboards for API latency (p50/p95/p99), queue depth, cache hit ratio |
| **Sentry** | Captures unhandled exceptions, stack traces, and performance transactions with release/commit tagging |
| **Better Stack** | External synthetic uptime monitoring for `/health`, ping every 60s from multiple regions |

### 14.2 Key Metrics Tracked

- HTTP request duration histogram, bucketed by route and status code
- Database query duration and connection pool saturation
- Redis command latency and cache hit/miss ratio
- BullMQ queue depth and job failure rate
- Node.js event loop lag and memory/heap usage
- AI provider (Gemini/OpenAI) request latency and error rate

### 14.3 `prom-client` Metrics Endpoint

```javascript
import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
register.registerMetric(httpDuration);

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

### 14.4 Alerting Thresholds

| Alert | Condition | Channel |
|---|---|---|
| High error rate | 5xx rate > 2% over 5 min | Slack (critical) |
| High latency | p95 > 1.5s over 5 min | Slack (warning) |
| DB pool exhaustion | Pool utilization > 90% | Slack (critical) |
| Queue backlog | BullMQ waiting jobs > 500 | Slack (warning) |
| Uptime failure | `/health` fails 2 consecutive checks | Slack + SMS (critical) |

---

## 15. Logging Pipeline

### 15.1 Structured Logging

All logs are emitted as structured JSON via **Pino**, never `console.log`, with a consistent schema across every service.

```javascript
{
  "level": "info",
  "time": "2026-08-03T10:15:22.301Z",
  "service": "backend-api",
  "requestId": "9f1a3c2e-...",
  "userId": "usr_8823",
  "route": "/api/orders",
  "method": "POST",
  "statusCode": 201,
  "durationMs": 142,
  "message": "Order created successfully"
}
```

### 15.2 Log Flow Diagram

```mermaid
flowchart LR
    APP[Backend/Worker - Pino JSON logs] --> STDOUT[stdout/stderr]
    STDOUT --> RAILWAY[Railway Log Drain]
    RAILWAY --> BSTACK[Better Stack Logs]
    BSTACK --> SEARCH[Searchable Log Explorer]
    BSTACK --> ALERT[Log-based Alerts]
```

- Every request is tagged with a unique `requestId` (via `AsyncLocalStorage` / middleware), propagated through every downstream log line for that request, making distributed tracing across service/worker boundaries possible without a full tracing stack.
- Logs are written exclusively to `stdout`/`stderr` — never to local files — following twelve-factor app principles, since containers are ephemeral and local disk logs would be lost on restart.
- Railway's log drain forwards stdout logs to Better Stack, where they are indexed and retained for 30 days (production) / 7 days (staging).
- **PII redaction middleware** strips sensitive fields (`password`, `token`, `cardNumber`) from log payloads before they're ever serialized.

---

## 16. Backup & Disaster Recovery

### 16.1 Backup Strategy

```mermaid
flowchart TB
    PG[(Production Postgres)] -->|continuous WAL| S3A[S3 - WAL Archive]
    PG -->|nightly full dump| S3B[S3 - Daily Snapshot, 30-day retention]
    RD[(Production Redis - AOF)] -->|hourly RDB snapshot| S3C[S3 - Redis Snapshots]
    S3A --> PITR[Point-in-Time Recovery]
    S3B --> RESTORE[Full Restore Path]
```

| Asset | Backup Method | Frequency | Retention |
|---|---|---|---|
| PostgreSQL | `pg_dump` full snapshot + continuous WAL archiving | Nightly + continuous | 30 days |
| Redis | RDB snapshot | Hourly | 7 days |
| Uploaded media (Cloudinary/S3) | Provider-native versioning/replication | Continuous | Provider default |
| Environment secrets | Encrypted export to secure vault | On every change | Indefinite (versioned) |

### 16.2 Recovery Objectives

- **RPO (Recovery Point Objective):** ≤ 15 minutes, via continuous WAL archiving.
- **RTO (Recovery Time Objective):** ≤ 1 hour for full-service restoration on a fresh Railway/Render Postgres instance.

### 16.3 Disaster Recovery Runbook (Summary)

```mermaid
sequenceDiagram
    participant OnCall as On-call Engineer
    participant Railway
    participant S3
    participant DNS

    OnCall->>Railway: Detect primary outage via alert
    OnCall->>S3: Fetch latest snapshot + WAL segments
    OnCall->>Railway: Provision new Postgres instance
    OnCall->>Railway: Restore snapshot + replay WAL (PITR)
    OnCall->>Railway: Point backend DATABASE_URL to restored instance
    OnCall->>DNS: Update failover CNAME if provider-level outage
    OnCall->>OnCall: Run smoke tests + verify data integrity
    OnCall->>OnCall: Post-incident report
```

---

## 17. SSL, HTTPS & Security Hardening

### 17.1 TLS/SSL

- Vercel and Railway both provision and auto-renew TLS certificates (Let's Encrypt-backed) for all custom domains — no manual certificate management in the managed path.
- Self-hosted/VPS DR path uses **Certbot** with an auto-renewal cron:

```bash
0 3 * * * certbot renew --quiet && systemctl reload nginx
```

- `TLSv1.2`/`TLSv1.3` only; `TLSv1.0`/`TLSv1.1` and weak ciphers explicitly disabled at the Nginx layer.

### 17.2 Security Headers

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Force HTTPS, prevent downgrade attacks |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Content-Security-Policy` | Restrictive allowlist of script/style/img sources | Mitigate XSS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |

### 17.3 Application-Layer Hardening

```mermaid
flowchart TB
    REQ[Incoming Request] --> HELMET[helmet - security headers]
    HELMET --> CORS[CORS allowlist check]
    CORS --> RATE[Rate limiter - express-rate-limit + Redis store]
    RATE --> SANITIZE[Input sanitization - express-validator/zod]
    SANITIZE --> AUTH[JWT verification]
    AUTH --> HANDLER[Route Handler]
```

- **Helmet** applies secure defaults for all response headers.
- **CORS** is restricted to an explicit origin allowlist per environment — no wildcard `*` in staging/production.
- **express-rate-limit** backed by Redis provides distributed rate limiting across multiple backend replicas (not per-instance memory, which would be trivially bypassed by hitting different replicas).
- **Input validation** (Zod schemas) runs before any handler logic executes, rejecting malformed payloads at the edge.
- **Dependency scanning**: `npm audit` in CI plus Trivy container scanning block any build containing a CRITICAL/HIGH CVE from being deployed.
- **Secrets never logged**: PII/secret redaction middleware runs before any structured log line is emitted.

---

## 18. Secrets Management

### 18.1 Secrets Flow

```mermaid
flowchart TB
    DEV[Developer] -->|writes locally, gitignored| LOCALENV[.env - local only]
    DEV -->|stores| GHS[GitHub Encrypted Secrets]
    GHS -->|injected at deploy time| RAILWAY[Railway Environment Variables]
    GHS -->|injected at build time| VERCEL[Vercel Environment Variables]
    RAILWAY --> RUNTIME[Backend Runtime - process.env]
    VERCEL --> BUILD[Frontend Build - import.meta.env]
```

### 18.2 Rules

- `.env` is listed in `.gitignore` at the repository root; only `.env.example` (variable names, no values) is committed.
- Production secrets are entered **directly** into Railway's and Vercel's dashboards / CLI — never pasted into a GitHub Actions YAML file in plaintext.
- GitHub Actions secrets (`RAILWAY_TOKEN_PROD`, `VERCEL_TOKEN`, etc.) are scoped to the `production` **Environment**, which enforces the manual-approval gate described in Section 6.3 — a compromised feature-branch workflow cannot read production secrets.
- **Secret rotation policy**: JWT signing secrets and payment gateway keys are rotated on a fixed schedule (quarterly) and immediately on suspected compromise, with a dual-secret grace period for JWT rotation (`JWT_ACCESS_SECRET` + `JWT_ACCESS_SECRET_PREVIOUS`) so in-flight tokens aren't invalidated mid-rotation.
- No secret is ever interpolated into a Docker image at build time — all secrets are injected as runtime environment variables, keeping built images environment-agnostic and safe to promote unchanged from staging to production.

---

## 19. Infrastructure Scalability Strategy

### 19.1 Horizontal Scaling Model

```mermaid
flowchart TB
    LB[Railway Load Balancer] --> R1[Backend Replica 1]
    LB --> R2[Backend Replica 2]
    LB --> R3[Backend Replica N]
    R1 --> PGB[PgBouncer Pool]
    R2 --> PGB
    R3 --> PGB
    R1 --> RD[(Shared Redis)]
    R2 --> RD
    R3 --> RD
    R1 -.socket.io state.-> RD
    R2 -.socket.io state.-> RD
```

- The backend is **fully stateless**: no in-memory session data, no in-memory Socket.IO adapter state — all shared state lives in Redis, so any replica can serve any request. This is what makes horizontal autoscaling safe.
- Railway autoscaling policy scales `backend-api` replicas based on CPU (>70%) and memory (>75%) thresholds, with a minimum of 2 replicas in production for zero-downtime rolling deploys.
- The Socket.IO Redis adapter (Section 12.2) ensures real-time events broadcast correctly across replicas, not just within a single instance's connected sockets.

### 19.2 Database Scaling Path

| Stage | Strategy |
|---|---|
| Current | Single primary + PgBouncer pooling + 1 read replica |
| Growth | Add additional read replicas for analytics/AI recommendation workloads |
| Scale | Introduce table partitioning on high-volume tables (orders, events) by date range |
| Extreme scale | Evaluate sharding by tenant/seller ID if multi-tenant volume demands it |

### 19.3 Caching Strategy for Scale

- Hot product/catalog data cached in Redis with a short TTL and cache-aside invalidation on write.
- CDN-level caching (Vercel Edge) for all static frontend assets, removing static-asset load from the origin entirely.
- Read-through caching for AI recommendation results (expensive to compute) with a longer TTL, since recommendations don't need to be real-time-fresh.

### 19.4 Background Job Scaling

Worker containers scale independently of the API — BullMQ concurrency and worker replica count are tuned separately based on queue depth metrics (Section 14.2), so a burst of AI-embedding jobs never starves API request-handling capacity.

---

## 20. Production Readiness Checklist

- [ ] All environment variables set and verified in Railway + Vercel production dashboards
- [ ] Database migrations applied via `prisma migrate deploy`, not `db push`
- [ ] Read replica provisioned and connection string verified
- [ ] Redis AOF persistence enabled and verified
- [ ] TLS certificates valid and auto-renewal confirmed
- [ ] Security headers verified via `securityheaders.com` scan
- [ ] Rate limiting tested under load (k6/Artillery load test)
- [ ] Sentry error tracking receiving events from production
- [ ] Prometheus `/metrics` endpoint scraped and visible in Grafana
- [ ] Better Stack uptime monitor configured for `/health` from 3+ regions
- [ ] Backup job verified with a test restore in staging
- [ ] Disaster recovery runbook rehearsed at least once
- [ ] GitHub `production` environment protection rule requires manual approval
- [ ] Secrets rotated from any values used during development
- [ ] `npm audit` and Trivy scans show zero CRITICAL/HIGH vulnerabilities
- [ ] Load-tested checkout/payment flow end-to-end in staging
- [ ] Rollback procedure tested (Railway rollback + Vercel alias swap)
- [ ] CORS allowlist restricted to production domains only
- [ ] Logging pipeline confirmed flowing into Better Stack Logs
- [ ] On-call alerting (Slack/SMS) tested with a simulated incident

---

## 21. Infrastructure Summary Diagram

```mermaid
flowchart TB
    subgraph Client
        U((User Browser))
    end

    subgraph Edge["Edge / CDN"]
        VERC[Vercel Edge Network - Frontend]
    end

    subgraph Compute["Application Layer"]
        API1[Backend Replica 1 - Railway]
        API2[Backend Replica 2 - Railway]
        WK[Worker - BullMQ Jobs]
    end

    subgraph Data["Data Layer"]
        PGB[PgBouncer]
        PG[(Postgres Primary)]
        PGR[(Postgres Read Replica)]
        RD[(Redis - Cache/Queue/PubSub)]
    end

    subgraph External["External Services"]
        AI[Gemini/OpenAI]
        PAY[Razorpay/Stripe]
        MAIL[SES/SendGrid]
        MEDIA[Cloudinary/S3]
    end

    subgraph Observability["Observability & Ops"]
        SENTRY[Sentry]
        PROM[Prometheus + Grafana]
        BSTACK[Better Stack - Logs + Uptime]
        GH[GitHub Actions CI/CD]
    end

    subgraph DR["Backup & DR"]
        S3B[S3 - Postgres/Redis Backups]
        RENDER[Render - DR Standby]
    end

    U --> VERC
    VERC --> API1
    VERC --> API2
    API1 --> PGB
    API2 --> PGB
    PGB --> PG
    PG --> PGR
    API1 --> RD
    API2 --> RD
    WK --> RD
    WK --> PG
    API1 --> AI
    API1 --> PAY
    API1 --> MAIL
    API1 --> MEDIA
    API1 --> SENTRY
    API1 --> PROM
    API1 --> BSTACK
    PG --> S3B
    RD --> S3B
    GH --> API1
    GH --> API2
    GH --> VERC
    PG -.failover.-> RENDER
```

**End of Phase 6 — DevOps & Infrastructure Architecture**