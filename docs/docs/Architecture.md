# AI-Powered Smart Commerce Platform — System Design Document

**Stack:** React + TypeScript + Vite + Tailwind + Shadcn UI | Node.js + Express + Prisma + PostgreSQL + Redis | JWT + Refresh Token + RBAC | Gemini/OpenAI | Vercel + Railway

---

## 1. Complete Software Architecture

### 1.1 Architectural Style

Use a **Modular Monolith** for the backend, not microservices. At your current stage, microservices add operational overhead (service discovery, distributed tracing, network latency, multiple deployments) without a corresponding benefit — you don't have the traffic or team size to justify it. A modular monolith gives you:

- Clear domain boundaries (modules) that can be extracted into microservices later if needed
- Single deployable unit → simpler CI/CD, easier debugging, one database transaction boundary
- A natural migration path: each module becomes a service candidate once you have real scaling pressure on it (commonly the AI module and the search/catalog module are the first to split)

### 1.2 High-Level System Diagram (conceptual)

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Vercel)                        │
│   React SPA — Vite build — Shadcn UI — TanStack Query         │
└───────────────────────────┬────────────────────────────────┘
                             │ HTTPS (REST, JSON)
┌───────────────────────────▼────────────────────────────────┐
│                    API GATEWAY LAYER (Express)                │
│  - Rate limiting (Redis)                                      │
│  - Auth middleware (JWT verify)                                │
│  - Request validation (Zod)                                    │
│  - Centralized error handler                                   │
└───────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼──────────────────────┐
        ▼                    ▼                      ▼
┌───────────────┐   ┌────────────────┐    ┌──────────────────┐
│  Core Commerce │   │   AI Services   │    │  Identity Module  │
│  Modules       │   │   Module        │    │  (Auth/RBAC)      │
│  - Catalog     │   │  - Product      │    │  - Login/Refresh  │
│  - Cart        │   │    recs         │    │  - RBAC guards    │
│  - Orders      │   │  - Search       │    │  - Sessions        │
│  - Payments    │   │    (semantic)   │    └──────────────────┘
│  - Inventory   │   │  - Chat agent   │
└───────┬────────┘   │  - Content gen  │
        │            └────────┬────────┘
        │                     │
┌───────▼─────────────────────▼────────┐        ┌──────────────┐
│         Data Access Layer (Prisma)     │        │ Redis (cache, │
└───────┬────────────────────────────────┘        │ sessions,     │
        │                                          │ rate-limit,   │
┌───────▼────────┐                                 │ job queue)    │
│  PostgreSQL     │◄────────────────────────────────┤              │
│  (Railway)      │                                 └──────────────┘
└─────────────────┘
        │
┌───────▼────────────────┐
│ External AI Providers   │
│ Gemini API / OpenAI API │
└──────────────────────────┘
```

### 1.3 Layered Architecture (per module, backend)

Every backend module follows the same internal layering — this consistency is what keeps a modular monolith maintainable as it grows:

1. **Route layer** — defines endpoints, applies middleware (auth, validation), delegates to controller. No business logic here.
2. **Controller layer** — parses request, calls service, shapes HTTP response. No DB calls here.
3. **Service layer** — all business logic lives here. Framework-agnostic. This is what you'd unit test heavily.
4. **Repository layer** — wraps Prisma calls. Isolates the rest of the app from ORM specifics; makes swapping/mocking the DB trivial in tests.
5. **DTO/Validation layer** — Zod schemas for request/response shape, shared between route validation and (optionally) frontend via a shared types package.

This is the standard **Controller → Service → Repository** pattern. The rule that matters most: **services never talk to Express req/res, and controllers never talk to Prisma directly.** Violating this is the #1 way monoliths turn into unmaintainable spaghetti.

### 1.4 Cross-Cutting Concerns

- **Logging:** structured JSON logs (pino or winston), correlation ID per request (generate at gateway, propagate through async calls, include in AI provider logs for traceability/debugging)
- **Error handling:** a single custom `AppError` class hierarchy (e.g. `NotFoundError`, `ValidationError`, `UnauthorizedError`) caught by one centralized Express error middleware — never scatter try/catch response logic across controllers
- **Caching:** Redis as a read-through cache for catalog/product data, and as the session/refresh-token store
- **Background jobs:** Redis + BullMQ for anything async — AI embedding generation, email sending, order confirmation workflows, inventory reconciliation. Never block an HTTP request on an LLM call for anything non-critical to the response.
- **Idempotency:** for payment and order-creation endpoints, require an `Idempotency-Key` header, store the key + result in Redis with TTL, to survive retries safely

---

## 2. Folder Structure

### 2.1 Recommended Repo Strategy: Monorepo

Use a monorepo (npm/pnpm workspaces or Turborepo) with three packages: `apps/web`, `apps/api`, `packages/shared`. This lets you share TypeScript types (DTOs, enums, Zod schemas) between frontend and backend — eliminating an entire class of "frontend/backend contract drift" bugs.

```
smart-commerce-platform/
├── apps/
│   ├── web/                          # React + Vite frontend
│   │   ├── src/
│   │   │   ├── app/                  # App shell: providers, router, layout
│   │   │   ├── pages/                # Route-level components
│   │   │   ├── features/             # Feature-sliced modules
│   │   │   │   ├── auth/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── api.ts        # TanStack Query hooks calling backend
│   │   │   │   │   └── types.ts
│   │   │   │   ├── catalog/
│   │   │   │   ├── cart/
│   │   │   │   ├── checkout/
│   │   │   │   ├── orders/
│   │   │   │   ├── ai-search/
│   │   │   │   └── ai-assistant/
│   │   │   ├── components/ui/        # Shadcn generated components
│   │   │   ├── components/common/    # Shared app-specific components
│   │   │   ├── lib/                  # axios/fetch client, query client, utils
│   │   │   ├── stores/               # Zustand/client state (cart, UI state)
│   │   │   ├── hooks/                # Generic reusable hooks
│   │   │   ├── config/                # env, constants
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── api/                          # Node.js + Express backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.routes.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── auth.repository.ts
│       │   │   │   ├── auth.schema.ts    # Zod DTOs
│       │   │   │   └── auth.types.ts
│       │   │   ├── users/
│       │   │   ├── catalog/
│       │   │   ├── cart/
│       │   │   ├── orders/
│       │   │   ├── payments/
│       │   │   ├── inventory/
│       │   │   └── ai/
│       │   │       ├── ai.routes.ts
│       │   │       ├── ai.controller.ts
│       │   │       ├── providers/        # gemini.provider.ts, openai.provider.ts
│       │   │       ├── ai.service.ts     # provider-agnostic orchestration
│       │   │       └── prompts/          # versioned prompt templates
│       │   ├── middlewares/
│       │   │   ├── auth.middleware.ts
│       │   │   ├── rbac.middleware.ts
│       │   │   ├── rateLimiter.middleware.ts
│       │   │   ├── validate.middleware.ts
│       │   │   └── errorHandler.middleware.ts
│       │   ├── common/
│       │   │   ├── errors/               # AppError hierarchy
│       │   │   ├── utils/
│       │   │   └── constants/
│       │   ├── config/                   # env validation (Zod), redis, db, providers
│       │   ├── jobs/                     # BullMQ queues + workers
│       │   ├── lib/
│       │   │   ├── prisma.ts             # Prisma client singleton
│       │   │   └── redis.ts              # Redis client singleton
│       │   ├── app.ts                    # Express app assembly
│       │   └── server.ts                 # entrypoint
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── tests/
│           ├── unit/
│           └── integration/
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── schemas/                  # Zod schemas shared FE/BE
│       │   ├── types/                    # Shared TS types/enums
│       │   └── constants/
│       └── package.json
│
├── .github/workflows/                    # CI pipelines
├── turbo.json
├── package.json
└── README.md
```

**Why feature-sliced on frontend, module-sliced on backend:** the frontend organizes around what the *user does* (feature-first), the backend organizes around what the *domain owns* (module-first, mirroring bounded contexts). This is intentional, not inconsistent.

---

## 3. Database Architecture

### 3.1 Core Schema (entity-level, PostgreSQL via Prisma)

**Identity & Access**
- `User` — id, email, passwordHash, name, status, timestamps
- `Role` — id, name (ADMIN, SELLER, CUSTOMER, SUPPORT) — RBAC as a separate table, not an enum, so roles are manageable without a redeploy
- `UserRole` — join table (many-to-many; a user can hold multiple roles)
- `Permission` / `RolePermission` — optional finer-grained layer if you need permission-level (not just role-level) checks later
- `RefreshToken` — id, userId, tokenHash (never store raw token), deviceInfo, expiresAt, revokedAt

**Commerce Core**
- `Product` — id, sellerId, title, description, price, currency, status, categoryId, createdAt
- `ProductVariant` — SKU, attributes (JSONB: size/color/etc.), price override, stock
- `Category` — hierarchical (self-referencing parentId)
- `Inventory` — variantId, quantityAvailable, quantityReserved (reserved during checkout to prevent overselling)
- `Cart` / `CartItem` — userId (nullable for guest carts, keyed by sessionId instead)
- `Order` / `OrderItem` — snapshot pricing at time of purchase (never join live to Product for historical orders — copy the price/title into OrderItem)
- `Payment` — orderId, provider, status, providerRef, amount
- `Address` — userId, type (billing/shipping)
- `Review` — productId, userId, rating, content, aiSentimentScore (nullable, filled async)

**AI-Specific**
- `ProductEmbedding` — productId, embeddingVector, model, generatedAt — for semantic search (use `pgvector` extension on Postgres rather than a separate vector DB initially; simplifies ops)
- `AIConversation` / `AIMessage` — for the shopping assistant/chat agent, scoped to userId
- `AIRecommendationLog` — tracks what was recommended, to whom, and whether it converted (feedback loop for future tuning)

### 3.2 Key Design Decisions

- **Soft deletes** on `Product`, `User`, `Order` (a `deletedAt` timestamp) — commerce data is rarely truly deleted for audit/legal reasons
- **Money as integers** (store cents, not floats) — avoid floating-point rounding bugs in a payments system
- **Optimistic concurrency on Inventory** — use a `version` column (Prisma supports this pattern) to prevent race conditions when two checkouts compete for the last unit of stock
- **Indexing strategy:** composite index on `(sellerId, status)` for seller dashboards, `(categoryId, status)` for catalog browsing, GIN index if you use JSONB attribute filtering, and an IVFFlat/HNSW index on the pgvector column for embedding search
- **Read replicas:** not needed at launch, but design repository layer so read-heavy queries (catalog browse) can be pointed at a replica later without touching service-layer code

### 3.3 Redis Data Model

| Purpose | Key pattern | Type |
|---|---|---|
| Session/refresh token store | `session:{userId}:{deviceId}` | Hash, TTL |
| Rate limiting | `ratelimit:{ip or userId}:{route}` | Counter, TTL |
| Product cache | `product:{id}` | String (JSON), TTL |
| Cart (guest) | `cart:{sessionId}` | Hash |
| Inventory reservation lock | `lock:inventory:{variantId}` | String, short TTL |
| AI response cache | `ai:cache:{hash(prompt+context)}` | String, TTL |
| Job queues | BullMQ-managed | Sorted sets/lists |

---

## 4. API Architecture

### 4.1 Style: REST, versioned

Use REST (`/api/v1/...`) — not GraphQL. GraphQL solves an over/under-fetching problem you don't have yet, and adds real complexity (resolver N+1 issues, caching complexity). Revisit only if the frontend genuinely needs flexible nested queries across many resources.

### 4.2 Resource Structure

```
/api/v1/auth/register
/api/v1/auth/login
/api/v1/auth/refresh
/api/v1/auth/logout
/api/v1/auth/me

/api/v1/products                GET (list, filter, paginate), POST (seller/admin)
/api/v1/products/:id            GET, PATCH, DELETE
/api/v1/products/:id/variants
/api/v1/categories

/api/v1/cart                    GET, POST (add item)
/api/v1/cart/items/:itemId      PATCH, DELETE

/api/v1/orders                  GET (own orders), POST (checkout)
/api/v1/orders/:id
/api/v1/orders/:id/cancel

/api/v1/payments/intent         POST — create payment intent
/api/v1/payments/webhook        POST — provider webhook (no JWT; signature-verified)

/api/v1/ai/search                POST — semantic product search
/api/v1/ai/recommendations/:userId
/api/v1/ai/assistant/chat        POST — conversational agent
/api/v1/ai/product/:id/describe  POST — AI-generated description (seller tool)

/api/v1/admin/users
/api/v1/admin/roles
```

### 4.3 Conventions

- **Pagination:** cursor-based for feeds/catalog (`?cursor=...&limit=20`), not offset-based — offset pagination degrades badly at scale and is unstable if new products are inserted mid-scroll
- **Filtering/sorting:** consistent query param convention, e.g. `?category=shoes&sort=-price&minPrice=1000`
- **Response envelope:** consistent shape —
  ```
  { "success": true, "data": {...}, "meta": {...} }
  { "success": false, "error": { "code": "...", "message": "..." } }
  ```
- **Validation:** Zod schemas at the route boundary; reject early, never let unvalidated data reach the service layer
- **Rate limiting:** per-route limits via Redis — stricter on `/auth/*` and `/ai/*` (AI calls are the most expensive resource you have) than on catalog browsing
- **API documentation:** OpenAPI spec generated from Zod schemas (zod-to-openapi) so docs can't drift from actual validation

---

## 5. Authentication Flow

### 5.1 Token Strategy

- **Access token (JWT):** short-lived (10–15 min), stored in memory on the client (not localStorage — vulnerable to XSS), sent as `Authorization: Bearer`
- **Refresh token:** long-lived (7–30 days), stored as an **httpOnly, Secure, SameSite=Strict cookie** — never accessible to JS, mitigating XSS token theft
- **Refresh token rotation:** every refresh issues a new refresh token and invalidates the old one (stored hashed in `RefreshToken` table); detect reuse of a revoked token as a signal of theft and revoke the entire session family

### 5.2 Flow

```
1. Login
   Client → POST /auth/login (email, password)
   Server: verify bcrypt hash → issue access JWT (short TTL) + refresh token
   Server: set refresh token as httpOnly cookie, store hashed refresh token in DB
   Client: stores access token in memory (e.g. React context/Zustand, not persisted)

2. Authenticated request
   Client → attaches "Authorization: Bearer <access_token>"
   Middleware: verifies JWT signature + expiry → attaches req.user (id, roles)

3. Access token expiry
   Client gets 401 → silently calls POST /auth/refresh (cookie sent automatically)
   Server: validates refresh token against DB hash + expiry + not-revoked
   Server: rotates refresh token, issues new access token
   Client: retries original request transparently (axios/fetch interceptor)

4. Logout
   Client → POST /auth/logout
   Server: revokes refresh token in DB, clears cookie
```

### 5.3 RBAC Design

- Roles are DB-driven, not hardcoded in JWT claims beyond a role-name snapshot (JWT carries `roles: ["SELLER"]` for fast checks; middleware can optionally re-verify against DB for sensitive actions in case a role was revoked mid-session)
- Middleware: `requireAuth` (validates JWT) → `requireRole(['ADMIN','SELLER'])` composable middleware per route
- Resource-level authorization (e.g. "seller can only edit their own product") is enforced in the **service layer**, not just route middleware — RBAC middleware handles *role* checks, service layer handles *ownership* checks
- Admin actions additionally logged to an `AuditLog` table (actor, action, target, timestamp)

### 5.4 Password & Account Security

- bcrypt/argon2 for password hashing (argon2id preferred if available on your host)
- Rate-limit login attempts per IP + per account (Redis counters) to blunt brute force
- Email verification flow before granting write permissions (seller onboarding especially)
- Optional: 2FA (TOTP) as a v2 item, not launch-blocking

---

## 6. AI Architecture

### 6.1 Design Principle: Provider Abstraction

Never call Gemini/OpenAI SDKs directly from business logic. Build a thin **provider interface** (`generateText`, `generateEmbedding`, `streamChat`) with concrete implementations per provider. This gives you:
- Ability to switch or A/B test providers without touching service code
- A single place to add retries, timeouts, cost logging, and prompt-injection guards
- Easier mocking in tests (no real API calls in CI)

### 6.2 AI Capabilities Map

| Feature | Model type | Sync/Async | Notes |
|---|---|---|---|
| Semantic product search | Embeddings | Sync (cached) | Query → embedding → pgvector similarity search |
| Product recommendations | Embeddings + collaborative signals | Async (precomputed) | Nightly/triggered job, not computed per-request |
| AI shopping assistant (chat) | LLM, streaming | Sync, streamed | SSE or streamed HTTP response to client |
| AI-generated product descriptions | LLM | Sync (seller-triggered) | Seller reviews/edits before publish — human in the loop |
| Review sentiment analysis | LLM (cheap/small model) | Async (background job) | Runs after review submission, doesn't block UX |
| Fraud/anomaly signals (optional v2) | LLM or rules | Async | Flags orders for review, doesn't auto-block |

### 6.3 Request Flow (Chat Assistant Example)

```
Client → POST /api/v1/ai/assistant/chat (message, conversationId)
  → rate-limit check (Redis, per-user)
  → load conversation context (last N messages from AIMessage table, capped)
  → build prompt: system prompt + context + user message + relevant product data
    (retrieval step: pull top-K relevant products via pgvector if query is product-related)
  → call provider.streamChat() → stream tokens back to client via SSE
  → persist final assistant message to AIConversation once stream completes
  → async: log usage (tokens, cost, latency) for observability
```

### 6.4 Cost & Reliability Controls

- **Caching:** hash(prompt + relevant context) → cache in Redis for non-personalized queries (e.g. "describe this product category") with a sane TTL
- **Timeouts + fallback:** every provider call has a hard timeout; on failure, degrade gracefully (e.g. fall back to keyword search if semantic search fails, rather than erroring the whole page)
- **Token/cost budgeting:** track tokens per user/day in Redis, enforce soft caps to prevent runaway cost from abuse
- **Prompt versioning:** store prompt templates as versioned files (`prompts/v1/assistant-system.ts`), log which version generated each response — critical for debugging regressions when you tune prompts
- **Guardrails:** validate/sanitize LLM output before rendering (especially if any output could contain HTML/markdown rendered client-side) to prevent injection
- **Async by default:** anything that doesn't need to block the user's immediate view (recommendations, sentiment, embeddings generation on product create/update) goes through the BullMQ job queue, not inline in the request path

---

## 7. Deployment Architecture

### 7.1 Topology

```
┌────────────────────┐        ┌─────────────────────────┐
│   Vercel            │        │   Railway                 │
│   - React SPA        │  API   │   - Express API           │
│   - Edge CDN/caching │───────►│   - PostgreSQL (managed)  │
│   - Preview deploys   │        │   - Redis (managed)       │
│   per PR              │        │   - BullMQ workers        │
└────────────────────┘        │     (separate service)     │
                                 └─────────────────────────┘
                                            │
                                 ┌─────────────────────────┐
                                 │  Gemini / OpenAI APIs     │
                                 └─────────────────────────┘
```

- **Frontend → Vercel:** static build + CDN edge caching, automatic preview URLs per PR, environment variables per environment (dev/staging/prod)
- **Backend → Railway:** the Express API as one service; **BullMQ workers as a separate Railway service** (separate process from the API, sharing the same Redis) so long-running AI/background jobs never compete with request-handling resources
- **Database → Railway-managed PostgreSQL**, with automated daily backups enabled; enable `pgvector` extension
- **Redis → Railway-managed Redis**, used for cache + queues + sessions

### 7.2 Environments

Three environments minimum: `development` (local docker-compose: Postgres + Redis), `staging` (Railway, mirrors prod config, used for QA and AI prompt testing before shipping), `production`.

### 7.3 CI/CD Pipeline (GitHub Actions)

```
On PR:
  1. Lint + typecheck (frontend & backend)
  2. Unit tests (service layer, AI provider mocks)
  3. Prisma migration dry-run / schema validation
  4. Build check (Vite build, tsc build for API)
  5. Vercel preview deploy (automatic)

On merge to main:
  1. Run full test suite (unit + integration)
  2. Run Prisma migrate deploy against staging
  3. Deploy API to Railway (staging)
  4. Smoke test staging (health check + auth flow + one AI call)
  5. Manual promote → Prisma migrate deploy (prod) → Deploy prod
```

### 7.4 Observability

- **Error tracking:** Sentry (frontend + backend)
- **Logs:** structured JSON, shipped to Railway's log stream (or an add-on like Better Stack/Logtail)
- **Metrics to watch from day one:** API p95 latency, AI provider latency/cost per request, refresh-token reuse-detection triggers, job queue depth/failure rate
- **Health checks:** `/health` (liveness) and `/health/ready` (checks DB + Redis connectivity) endpoints for Railway's health monitoring

### 7.5 Security Hardening (deployment-level)

- Environment secrets never committed — Railway/Vercel env var stores only
- CORS locked to the exact Vercel domain(s), not `*`
- Helmet middleware for standard HTTP security headers
- Webhook endpoints (payment provider) verify signatures, excluded from CSRF/JWT middleware but never trusted blindly
- Postgres and Redis not publicly exposed — internal Railway networking only

---

## 8. Complete Development Roadmap

Structured in phases, each phase shippable/demoable on its own — this matters both for your own motivation and for portfolio narrative (you can show progressive commits/releases).

### Phase 0 — Foundation (Week 1–2)
- Monorepo setup (Turborepo/pnpm workspaces), shared package skeleton
- Docker Compose for local Postgres + Redis
- Prisma schema v1 (User, Role, Product, Category — core only)
- Express app skeleton: config, error handler, health check, logging
- CI pipeline skeleton (lint, typecheck, build on PR)

### Phase 1 — Identity & Access (Week 2–3)
- Auth module: register, login, refresh rotation, logout
- RBAC middleware + role seed data
- Frontend: auth pages, protected route wrapper, axios interceptor for silent refresh
- Deliverable: a user can register, log in, stay logged in across refresh, and access role-gated routes

### Phase 2 — Core Commerce (Week 3–6)
- Product CRUD (seller-facing) + catalog browse/filter (customer-facing)
- Category management, inventory tracking with reservation logic
- Cart module (guest + authenticated merge-on-login)
- Checkout → Order creation, idempotent, with inventory locking
- Deliverable: a full buy-flow works end-to-end without AI or real payments (mock payment provider)

### Phase 3 — Payments & Orders (Week 6–7)
- Integrate a real payment provider (Stripe recommended over building your own) via the `payments` module
- Webhook handling, order status lifecycle, order history UI
- Deliverable: real transactions, correctly reflected in order/inventory state

### Phase 4 — AI Layer, Part 1: Search & Recommendations (Week 7–9)
- Provider abstraction layer (Gemini + OpenAI implementations)
- Embedding generation job (on product create/update) → pgvector storage
- Semantic search endpoint + frontend search UI
- Recommendation job (async, scheduled) + "recommended for you" UI section
- Deliverable: search that understands intent, not just keyword match

### Phase 5 — AI Layer, Part 2: Assistant & Content Tools (Week 9–11)
- Streaming chat assistant (conversation persistence, retrieval-augmented context)
- Seller-facing AI description generator
- Async review sentiment analysis
- Cost/rate-limit guardrails on all AI endpoints
- Deliverable: the "smart" in Smart Commerce is now visibly demoable

### Phase 6 — Admin, Observability & Hardening (Week 11–13)
- Admin dashboard: user/role management, audit log viewer, order oversight
- Sentry integration, structured logging, health checks
- Load-test critical paths (checkout, search) — fix N+1 queries, add missing indexes
- Security pass: rate limits tuned, CORS locked down, dependency audit

### Phase 7 — Deployment & Launch Readiness (Week 13–14)
- Staging environment fully mirrored to prod config
- CI/CD promotion pipeline finalized (staging → manual prod promote)
- Backup/restore drill on Postgres
- Documentation: API docs (OpenAPI), architecture README, runbook for on-call basics

### Phase 8 — Post-Launch / v2 Candidates
- 2FA, seller analytics dashboard, multi-currency, GraphQL BFF if the frontend outgrows REST, extracting the AI module into its own service if load demands it, read replicas if catalog read traffic grows significantly

---

## Staff-Level Notes (things that separate this from a tutorial project)

1. **Design for extraction, not extraction itself.** The modular monolith's module boundaries should be clean enough that any single module (most likely AI or Catalog/Search) could become its own service in a weekend if traffic demanded it — without that, you never actually get the option.
2. **Money and inventory correctness beat feature velocity.** Get idempotency, optimistic locking, and price-snapshotting right early — these bugs are silent until they cost you real money or a very public complaint.
3. **AI is a cost center with unpredictable latency — treat it like one.** Cache aggressively, budget tokens per user, and never let an LLM call sit directly in a critical-path request without a timeout and fallback.
4. **Auth is the one place where "good enough" isn't.** Refresh rotation + reuse detection is not optional at production grade — it's the difference between a stolen token being a non-event and a silent account takeover.
5. **Ship phase by phase.** Each phase above is a legitimate, demoable milestone — resist the urge to build all modules halfway before finishing one end-to-end.