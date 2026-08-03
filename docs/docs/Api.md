# AI-Powered Smart Commerce Platform — REST API Specification

**Version:** v1.0.0
**Base URL:** `https://api.smartcommerce.io/api/v1`
**Document Status:** Draft for Independent Frontend/Backend Development
**Owner:** Platform Engineering

---

## Table of Contents

1. [Platform Standards](#1-platform-standards)
   - 1.1 API Naming Convention
   - 1.2 Standard API Response Format
   - 1.3 Error Response Format
   - 1.4 Validation Strategy
   - 1.5 Rate Limiting Rules
   - 1.6 Versioning Strategy
   - 1.7 Authentication Flow
   - 1.8 Refresh Token Flow
   - 1.9 Security Best Practices
   - 1.10 Pagination Standard
   - 1.11 Filtering Standard
   - 1.12 Sorting Standard
   - 1.13 Search Standard
   - 1.14 Caching Strategy
   - 1.15 API Folder Structure
   - 1.16 Swagger / OpenAPI Documentation Structure
   - 1.17 Production Best Practices
2. Authentication Module
3. Products Module
4. Categories Module
5. Brands Module
6. Wishlist Module
7. Cart Module
8. Checkout Module
9. Orders Module
10. Reviews Module
11. Notifications Module
12. Seller Module
13. Admin Module
14. AI Module
15. Coupons Module
16. Uploads Module
17. Search Module
18. Analytics Module

---
## 1. Platform Standards

### 1.1 API Naming Convention

| Rule | Convention | Example |
|---|---|---|
| Resource naming | Plural nouns, kebab-case | `/products`, `/order-items` |
| URL casing | lowercase, hyphen-separated | `/forgot-password` |
| Verbs in URL | Never — HTTP method implies action | `POST /orders` not `/create-order` |
| Nested resources | Max 2 levels deep | `/products/:productId/reviews` |
| Query params | camelCase | `?sortBy=createdAt&minPrice=100` |
| JSON body/response fields | camelCase | `{ "firstName": "John" }` |
| Path parameters | camelCase, suffixed `Id` | `:productId`, `:orderId` |
| Boolean flags | `is`/`has` prefix | `isActive`, `hasVariants` |
| Enums | UPPER_SNAKE_CASE as values | `"status": "PENDING_PAYMENT"` |
| Versioning | URI-based | `/api/v1/...` |

All endpoints below are prefixed with the base URL `https://api.smartcommerce.io/api/v1` — shown as relative paths (e.g. `/auth/login`) for brevity.

---

### 1.2 Standard API Response Format

All successful responses (2xx) follow this envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Products fetched successfully",
  "data": { },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 154,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "requestId": "req_9f3ab21c",
    "timestamp": "2026-08-02T09:14:22.000Z"
  }
}
```

Rules:
- `data` is `null` for actions with no return payload (e.g. delete, logout).
- `meta.pagination` is only present on list endpoints.
- `meta.requestId` and `meta.timestamp` are present on every response for traceability/log correlation.

---

### 1.3 Error Response Format

All error responses (4xx/5xx) follow this envelope:

```json
{
  "success": false,
  "statusCode": 422,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields failed validation",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      },
      {
        "field": "password",
        "message": "Must be at least 8 characters"
      }
    ]
  },
  "meta": {
    "requestId": "req_9f3ab21c",
    "timestamp": "2026-08-02T09:14:22.000Z",
    "path": "/api/v1/auth/register"
  }
}
```

**Standard Error Codes:**

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Request body/query/params failed schema validation |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired access token |
| `FORBIDDEN` | 403 | Authenticated but lacks role/permission |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource / state conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `PAYMENT_FAILED` | 402 | Payment gateway declined/failed |
| `INTERNAL_ERROR` | 500 | Unhandled server error |
| `SERVICE_UNAVAILABLE` | 503 | Downstream dependency (Redis/DB/AI) down |
| `TOKEN_EXPIRED` | 401 | Access/refresh token expired |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `ACCOUNT_LOCKED` | 423 | Account locked after failed login attempts |
| `RESOURCE_LOCKED` | 423 | Resource being modified concurrently (e.g. stock) |

---

### 1.4 Validation Strategy

- **Layer:** All input validated at the route boundary using schema validation (Zod/Joi-equivalent) before reaching controllers — validation rules documented per-endpoint below are the contract.
- **Fail-fast:** All field errors are collected and returned together in `error.details[]`, not one at a time.
- **Sanitization:** HTML/script tags stripped from free-text fields (`description`, `reviewText`, etc.) to prevent stored XSS.
- **Type coercion:** Query params are strings on the wire; the validation layer coerces to number/boolean/array per documented type and rejects invalid coercions.
- **File validation:** MIME-type allowlist + max-size checks occur before any upload is streamed to storage.
- **Business-rule validation** (e.g. "cannot cancel a delivered order") is distinct from schema validation and returns `CONFLICT` (409), not `VALIDATION_ERROR` (422).

---

### 1.5 Rate Limiting Rules

Rate limiting is applied per IP + per authenticated user ID (whichever is stricter), using a Redis-backed sliding window.

| Scope | Limit | Window |
|---|---|---|
| Global (unauthenticated) | 100 requests | 15 min |
| Authenticated (general) | 300 requests | 15 min |
| `/auth/login` | 5 attempts | 15 min per IP+email |
| `/auth/register` | 5 attempts | 1 hour per IP |
| `/auth/forgot-password` | 3 attempts | 1 hour per email |
| `/auth/refresh-token` | 20 requests | 15 min |
| AI endpoints (`/ai/*`) | 20 requests | 5 min per user |
| Search endpoints | 60 requests | 1 min |
| Uploads | 30 requests | 15 min |
| Payment endpoints | 10 requests | 15 min |

On breach, respond `429 RATE_LIMITED` with headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735732800
Retry-After: 420
```

---

### 1.6 Versioning Strategy

- **Strategy:** URI path versioning — `/api/v1/...`, `/api/v2/...`.
- **Breaking changes** (removed fields, changed types, changed auth semantics) require a new major version.
- **Non-breaking additions** (new optional fields, new endpoints) ship within the current version.
- **Deprecation policy:** deprecated endpoints return a `Deprecation: true` and `Sunset: <date>` header for 6 months before removal, and are documented in a `CHANGELOG.md`.
- **Client contract:** frontend clients pin to a major version explicitly; no implicit "latest" routing in production.

---

### 1.7 Authentication Flow

1. Client calls `POST /auth/register` or `POST /auth/login`.
2. Server validates credentials, issues:
   - **Access Token** (JWT, 15 min expiry) — returned in JSON response body, held in memory on client (never localStorage).
   - **Refresh Token** (opaque/JWT, 7–30 day expiry) — set as `httpOnly`, `secure`, `sameSite=strict` cookie. Never exposed to JS.
3. Client attaches access token as `Authorization: Bearer <token>` on every subsequent request.
4. Protected routes verify JWT signature + expiry + embedded role claim via auth middleware before hitting controllers.
5. On `401 TOKEN_EXPIRED`, client silently calls `POST /auth/refresh-token` (cookie sent automatically) to obtain a new access token, then retries the original request once.
6. On refresh failure, client redirects to login and clears in-memory state.

---

### 1.8 Refresh Token Flow (Rotation)

1. Refresh tokens are single-use. Each call to `/auth/refresh-token`:
   - Validates the incoming refresh token against its hashed record in the DB (`RefreshToken` table, keyed by `jti`, user ID, device fingerprint).
   - **Revokes** the used token immediately (marks `revokedAt`).
   - Issues a **new** access token + a **new** refresh token (rotation), overwriting the cookie.
2. **Reuse detection:** if a revoked refresh token is presented again, the server treats it as a stolen-token signal and revokes **all** refresh tokens for that user (forces logout on every device), returning `401 UNAUTHORIZED`.
3. Refresh tokens are stored server-side hashed (never plaintext), scoped to a `deviceId`/`userAgent` fingerprint, and support per-device revocation (`GET /auth/sessions`, `DELETE /auth/sessions/:sessionId` — see Auth module).
4. Logout revokes the specific refresh token and clears the cookie.

---

### 1.9 Security Best Practices

- **Transport:** HSTS enforced, TLS 1.2+ only.
- **Cookies:** `httpOnly`, `secure`, `sameSite=strict` for refresh token; CSRF double-submit token required for cookie-based state-changing requests from browser clients.
- **Headers:** `helmet`-equivalent defaults — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy` restricting script/style origins.
- **Password storage:** bcrypt/argon2, min cost factor 12; never logged, never returned in any response.
- **RBAC:** enforced at middleware layer per route, not just at the UI — every mutating endpoint re-verifies role server-side.
- **Ownership checks:** in addition to role, resource-owner checks (e.g. seller can only edit their own product) applied before any mutation.
- **Input sanitization:** all free text sanitized against XSS; Prisma parameterized queries prevent SQL injection by default — raw queries are prohibited without a review flag.
- **IDOR protection:** all resource lookups scoped to the authenticated user/tenant unless the role explicitly permits cross-tenant access (Admin).
- **Secrets:** stored in a secrets manager (not `.env` in production); rotated quarterly.
- **Audit logging:** all Admin and Seller destructive/financial actions written to an immutable `AuditLog` table (actor, action, target, before/after diff, IP, timestamp).
- **PII:** encrypted at rest for sensitive fields (phone, address); masked in logs.
- **Dependency scanning:** CI blocks on critical CVEs (Snyk/Dependabot equivalent).
- **Webhook verification:** Razorpay/Stripe webhook signatures verified before processing; replay protection via event-ID idempotency table.

---

### 1.10 Pagination Standard

Cursor-free, offset-based pagination for all list endpoints unless noted.

**Query Params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | integer | 1 | 1-indexed |
| `limit` | integer | 20 | Max 100 |

**Response `meta.pagination`:**
```json
{
  "page": 1,
  "limit": 20,
  "totalItems": 154,
  "totalPages": 8,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

High-volume, real-time-write feeds (e.g. Admin audit logs, notifications at scale) may additionally support cursor pagination via `?cursor=<id>&limit=20`, documented per-endpoint where applicable.

---

### 1.11 Filtering Standard

- Filters are passed as query params matching the resource's filterable fields, e.g. `?category=electronics&minPrice=500&maxPrice=5000&inStock=true`.
- Range filters use `min`/`max` prefixes: `minPrice`, `maxPrice`, `minRating`.
- Multi-value filters accept comma-separated values: `?status=PENDING,PROCESSING`.
- Unknown filter keys are ignored (not rejected) to keep clients forward-compatible, unless `strictFiltering` mode is documented for an endpoint.
- Each endpoint documents its own filterable field allowlist below.

---

### 1.12 Sorting Standard

- Param: `?sortBy=<field>&order=asc|desc`.
- Multi-field sort: `?sortBy=price,-createdAt` (`-` prefix = descending) as an alternative compact form; `order` param used when `sortBy` is a single field.
- Default sort is documented per endpoint (typically `createdAt desc`).
- Only allowlisted fields per resource are sortable; others return `VALIDATION_ERROR`.

---

### 1.13 Search Standard

- Full-text search param: `?q=<term>` (URL-encoded, min 2 chars, max 200 chars).
- Search is implemented via PostgreSQL `tsvector`/GIN index for structured search (Products, Orders) and combined with AI semantic search (pgvector embeddings) for the dedicated AI Search / Global Search endpoints.
- Search responses include a `matchScore` (0–1) per item where relevance ranking applies.
- Typeahead/autocomplete variants are documented under the Search module.

---

### 1.14 Caching Strategy

| Layer | Mechanism | TTL | Invalidation |
|---|---|---|---|
| Product listing/detail | Redis cache-aside | 5 min | On product update/delete (key `product:{id}` deleted) |
| Category/Brand trees | Redis, warm on boot | 30 min | On CRUD write |
| Trending/Featured products | Redis, background job refresh (BullMQ cron) | 15 min | Scheduled recompute |
| Cart | Redis primary store (not Postgres) | Session-bound | Write-through on every mutation |
| Session/Refresh token metadata | Redis | Matches token TTL | On rotation/revocation |
| AI responses (recommendations, comparisons) | Redis, keyed by input hash | 10 min | TTL-based only |
| HTTP layer | `ETag` + `Cache-Control` on public GET endpoints (products, categories) | `max-age=300` | Client revalidates via ETag |
| Rate limit counters | Redis | Matches window | TTL-based |

Cache keys are namespaced: `{env}:{resource}:{id}:{version}` to allow safe bulk flush per resource type.

---

### 1.15 API Folder Structure

```
src/
├── config/                 # env, db, redis, third-party client configs
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.validation.ts
│   │   └── auth.types.ts
│   ├── products/
│   ├── categories/
│   ├── brands/
│   ├── wishlist/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── reviews/
│   ├── notifications/
│   ├── seller/
│   ├── admin/
│   ├── ai/
│   ├── coupons/
│   ├── uploads/
│   ├── search/
│   └── analytics/
├── middlewares/             # auth, rbac, rateLimiter, errorHandler, validator
├── jobs/                    # BullMQ queues + processors (email, AI, payouts)
├── lib/                     # prisma client, redis client, logger
├── utils/
├── docs/                    # openapi.yaml + swagger assets
└── app.ts / server.ts
```

Each module is self-contained (routes → controller → service → validation), keeping REST contracts independently ownable by module teams.

---

### 1.16 Swagger / OpenAPI Documentation Structure

- **Spec format:** OpenAPI 3.1, authored as modular YAML under `src/docs/paths/*.yaml`, bundled at build time into `openapi.json`.
- **Served at:** `/api/v1/docs` (Swagger UI), raw spec at `/api/v1/docs.json`.
- **Structure:**
  ```
  docs/
  ├── openapi.yaml            # root: info, servers, security schemes, $refs
  ├── paths/
  │   ├── auth.yaml
  │   ├── products.yaml
  │   └── ...
  ├── components/
  │   ├── schemas/             # Product.yaml, Order.yaml, User.yaml, etc.
  │   ├── responses/           # reusable error response objects
  │   └── parameters/          # reusable pagination/filter/sort params
  ```
- **Auth scheme:** `bearerAuth` (JWT) registered as a global `securityScheme`; per-route `security: []` override for public endpoints.
- **CI gate:** OpenAPI spec is linted (Spectral) and diffed against the previous version on every PR; breaking changes without a version bump fail the build.
- This document is the human-readable source of truth that the OpenAPI YAML is generated/kept in sync with.

---

### 1.17 Production Best Practices

- **Health checks:** `GET /health` (liveness) and `GET /health/ready` (readiness — checks DB/Redis connectivity), excluded from auth/rate-limit.
- **Idempotency:** all payment and order-creation POSTs accept an `Idempotency-Key` header; duplicate keys within 24h return the original response instead of re-executing.
- **Graceful degradation:** AI endpoints fail soft (return cached/fallback recommendations) rather than 5xx if the AI provider times out.
- **Structured logging:** JSON logs with `requestId`, `userId`, `route`, `latencyMs`, correlated across services.
- **Observability:** metrics (RED: rate/errors/duration) exported per route; distributed tracing across API → BullMQ jobs → external calls.
- **Background jobs:** all slow/non-critical-path work (emails, invoices, AI embedding generation, payout calculation) offloaded to BullMQ queues, never inline in the request/response cycle.
- **Database:** connection pooling via Prisma + PgBouncer; all list queries paginated (no unbounded `findMany`); indexes on every foreign key + filter/sort column.
- **Transactions:** multi-table writes (order + order items + payment + stock decrement) wrapped in Prisma `$transaction` with row-level locking on stock.
- **Blue/green or rolling deploys** with DB migrations run as a separate, backward-compatible step before code rollout.
- **Environment parity:** staging mirrors production config (excluding secrets/scale).
- **Circuit breakers** around third-party calls (Razorpay, Stripe, Gemini/OpenAI) to prevent cascading failures.

---
## 2. Authentication Module

Base path: `/auth`

### 2.1 Register

| | |
|---|---|
| **Method / URL** | `POST /auth/register` |
| **Description** | Creates a new user account (Customer or Seller). Sends a verification email. |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Headers**
| Header | Required | Description |
|---|---|---|
| `Content-Type` | Yes | `application/json` |

**Request Body**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "StrongP@ss123",
  "role": "CUSTOMER",
  "phone": "+919876543210"
}
```

**Validation Rules**
- `fullName`: string, required, 2–100 chars.
- `email`: string, required, valid email, unique.
- `password`: string, required, min 8 chars, must contain 1 uppercase, 1 lowercase, 1 number, 1 special char.
- `role`: enum `["CUSTOMER", "SELLER"]`, required. (`ADMIN` cannot self-register.)
- `phone`: string, optional, E.164 format.

**Success Response — `201 Created`**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Account created. Please verify your email.",
  "data": {
    "userId": "usr_8f2a1c",
    "email": "john@example.com",
    "role": "CUSTOMER",
    "isEmailVerified": false
  }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 409 | `CONFLICT` | Email already registered |
| 422 | `VALIDATION_ERROR` | Invalid/missing fields |
| 429 | `RATE_LIMITED` | Too many registration attempts |

**Example Request**
```bash
curl -X POST https://api.smartcommerce.io/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","email":"john@example.com","password":"StrongP@ss123","role":"CUSTOMER"}'
```

---

### 2.2 Login

| | |
|---|---|
| **Method / URL** | `POST /auth/login` |
| **Description** | Authenticates a user and issues access + refresh tokens. |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Request Body**
```json
{
  "email": "john@example.com",
  "password": "StrongP@ss123"
}
```

**Validation Rules**
- `email`: required, valid email.
- `password`: required, non-empty.

**Success Response — `200 OK`**
Sets `refreshToken` as `httpOnly` cookie. Body:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 900,
    "user": {
      "id": "usr_8f2a1c",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "CUSTOMER",
      "isEmailVerified": true
    }
  }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Wrong email/password |
| 403 | `FORBIDDEN` | Email not verified (if verification is enforced pre-login) |
| 423 | `ACCOUNT_LOCKED` | Too many failed attempts |
| 422 | `VALIDATION_ERROR` | Malformed request |

**Example Request**
```bash
curl -X POST https://api.smartcommerce.io/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"StrongP@ss123"}'
```

---

### 2.3 Logout

| | |
|---|---|
| **Method / URL** | `POST /auth/logout` |
| **Description** | Revokes the current refresh token and clears the auth cookie. |
| **Auth Required** | Yes (Access Token) |
| **Roles Allowed** | Customer, Seller, Admin |

**Headers**
| Header | Required |
|---|---|
| `Authorization: Bearer <accessToken>` | Yes |

**Request Body:** None

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Logged out successfully", "data": null }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing/invalid access token |

---

### 2.4 Refresh Token

| | |
|---|---|
| **Method / URL** | `POST /auth/refresh-token` |
| **Description** | Rotates the refresh token and issues a new access token. See §1.8. |
| **Auth Required** | No (uses `httpOnly` refresh cookie) |
| **Roles Allowed** | Public (cookie-gated) |

**Headers**
| Header | Required |
|---|---|
| `Cookie: refreshToken=<token>` | Yes (sent automatically by browser) |

**Success Response — `200 OK`**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Token refreshed",
  "data": { "accessToken": "eyJhbGciOi...", "expiresIn": 900 }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 401 | `TOKEN_EXPIRED` | Refresh token expired |
| 401 | `UNAUTHORIZED` | Invalid/reused/revoked token (triggers full session revocation) |

---

### 2.5 Verify Email

| | |
|---|---|
| **Method / URL** | `GET /auth/verify-email` |
| **Description** | Verifies a user's email via a signed token sent by email. |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Query Parameters**
| Param | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | Signed verification token |

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Email verified successfully", "data": { "isEmailVerified": true } }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing token |
| 401 | `TOKEN_EXPIRED` | Verification link expired |
| 404 | `NOT_FOUND` | Token doesn't match any user |

---

### 2.6 Forgot Password

| | |
|---|---|
| **Method / URL** | `POST /auth/forgot-password` |
| **Description** | Sends a password-reset link/OTP to the user's email. |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Request Body**
```json
{ "email": "john@example.com" }
```

**Validation Rules**
- `email`: required, valid email. (Always returns 200 regardless of existence, to prevent user enumeration.)

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "If an account exists, a reset link has been sent", "data": null }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Invalid email format |
| 429 | `RATE_LIMITED` | Too many requests |

---

### 2.7 Reset Password

| | |
|---|---|
| **Method / URL** | `POST /auth/reset-password` |
| **Description** | Sets a new password using a valid reset token. Revokes all existing sessions. |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Request Body**
```json
{ "token": "reset_tok_9f21ab", "newPassword": "NewStrongP@ss1" }
```

**Validation Rules**
- `token`: required.
- `newPassword`: required, same complexity rules as registration; must differ from current password.

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Password reset successful. Please log in again.", "data": null }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 401 | `TOKEN_EXPIRED` | Reset token expired/used |
| 422 | `VALIDATION_ERROR` | Weak password |

---

### 2.8 Change Password

| | |
|---|---|
| **Method / URL** | `PATCH /auth/change-password` |
| **Description** | Changes password for the logged-in user (requires current password). |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer, Seller, Admin |

**Request Body**
```json
{ "currentPassword": "StrongP@ss123", "newPassword": "EvenStrongerP@ss1" }
```

**Validation Rules**
- `currentPassword`: required, must match stored hash.
- `newPassword`: required, complexity rules apply, must differ from current.

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Password changed successfully", "data": null }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Wrong current password |
| 422 | `VALIDATION_ERROR` | Weak new password |

---

### 2.9 Get Current User

| | |
|---|---|
| **Method / URL** | `GET /auth/me` |
| **Description** | Returns the authenticated user's profile. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer, Seller, Admin |

**Success Response — `200 OK`**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User fetched",
  "data": {
    "id": "usr_8f2a1c",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "role": "CUSTOMER",
    "isEmailVerified": true,
    "avatarUrl": "https://cdn.smartcommerce.io/avatars/usr_8f2a1c.webp",
    "createdAt": "2026-01-12T10:00:00.000Z"
  }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing/expired token |

---

### 2.10 Update Profile

| | |
|---|---|
| **Method / URL** | `PATCH /auth/me` |
| **Description** | Updates the authenticated user's profile fields. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer, Seller, Admin |

**Request Body** (all optional, partial update)
```json
{ "fullName": "John A. Doe", "phone": "+919876543211", "avatarUrl": "https://cdn.../new.webp" }
```

**Validation Rules**
- `fullName`: string, 2–100 chars.
- `phone`: E.164 format.
- `avatarUrl`: valid URL, must point to `uploads` CDN domain.
- Email changes are **not** allowed via this endpoint (requires a separate verified email-change flow, out of scope for v1).

**Success Response — `200 OK`** — returns updated user object (same shape as §2.9).

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing/expired token |
| 422 | `VALIDATION_ERROR` | Invalid field values |

---

### 2.11 Get Active Sessions *(supports §1.8 rotation/device management)*

| | |
|---|---|
| **Method / URL** | `GET /auth/sessions` |
| **Description** | Lists all active refresh-token sessions (devices) for the current user. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer, Seller, Admin |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Sessions fetched",
  "data": [
    { "sessionId": "sess_1a2b", "device": "Chrome on Windows", "ip": "49.36.x.x", "lastActiveAt": "2026-08-01T18:22:00.000Z", "current": true }
  ]
}
```

### 2.12 Revoke Session

| | |
|---|---|
| **Method / URL** | `DELETE /auth/sessions/:sessionId` |
| **Description** | Revokes a specific device's refresh token (remote logout). |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer, Seller, Admin |

**Path Parameters**
| Param | Type | Description |
|---|---|---|
| `sessionId` | string | Session identifier from §2.11 |

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Session revoked", "data": null }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 404 | `NOT_FOUND` | Session doesn't belong to user / doesn't exist |

---
## 3. Products Module

Base path: `/products`

### 3.1 Create Product

| | |
|---|---|
| **Method / URL** | `POST /products` |
| **Description** | Creates a new product listing under the authenticated seller. |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller, Admin |

**Headers**
| Header | Required |
|---|---|
| `Authorization: Bearer <token>` | Yes |
| `Content-Type: application/json` | Yes |
| `Idempotency-Key` | Recommended |

**Request Body**
```json
{
  "title": "Wireless Noise Cancelling Headphones",
  "description": "Over-ear headphones with ANC and 40h battery.",
  "categoryId": "cat_electronics_audio",
  "brandId": "brand_sony",
  "basePrice": 24999,
  "discountPrice": 19999,
  "sku": "SNY-WH-1000XM5",
  "stock": 120,
  "tags": ["headphones", "wireless", "anc"],
  "attributes": { "color": "Black", "warranty": "1 year" },
  "isActive": true
}
```

**Validation Rules**
- `title`: required, 5–200 chars.
- `description`: required, 20–5000 chars, sanitized.
- `categoryId`: required, must reference existing category.
- `brandId`: optional, must reference existing brand.
- `basePrice`: required, decimal > 0.
- `discountPrice`: optional, decimal ≥ 0, must be < `basePrice`.
- `sku`: required, unique per seller, alphanumeric + hyphens.
- `stock`: required, integer ≥ 0.
- `tags`: array of strings, max 20 items.
- `attributes`: object, free-form key-value (max 30 keys).

**Success Response — `201 Created`**
```json
{
  "success": true, "statusCode": 201, "message": "Product created successfully",
  "data": { "id": "prod_5c9e1a", "title": "Wireless Noise Cancelling Headphones", "status": "PENDING_REVIEW", "slug": "wireless-noise-cancelling-headphones-5c9e1a" }
}
```
> Note: newly created products enter `PENDING_REVIEW` and require Admin moderation (see §12.4) before appearing in public listings.

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing token |
| 403 | `FORBIDDEN` | Customer role attempting to create |
| 404 | `NOT_FOUND` | Invalid `categoryId`/`brandId` |
| 409 | `CONFLICT` | Duplicate SKU for this seller |
| 422 | `VALIDATION_ERROR` | Invalid fields |

---

### 3.2 Update Product

| | |
|---|---|
| **Method / URL** | `PATCH /products/:productId` |
| **Description** | Updates fields of an existing product. Partial update. |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller (owner only), Admin |

**Path Parameters**
| Param | Type | Description |
|---|---|---|
| `productId` | string | Product identifier |

**Request Body:** Any subset of §3.1 fields.

**Validation Rules:** Same per-field rules as Create; `sku` uniqueness re-checked if changed. Editing a live product's `basePrice`/`title`/`categoryId` re-flags status to `PENDING_REVIEW` if platform policy requires re-moderation on material changes.

**Success Response — `200 OK`** — returns updated product object (see §3.4 for full shape).

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 403 | `FORBIDDEN` | Seller does not own this product |
| 404 | `NOT_FOUND` | Product doesn't exist |
| 409 | `CONFLICT` | SKU collision |
| 422 | `VALIDATION_ERROR` | Invalid fields |

---

### 3.3 Delete Product

| | |
|---|---|
| **Method / URL** | `DELETE /products/:productId` |
| **Description** | Soft-deletes a product (sets `deletedAt`, hidden from all listings; historical orders retain a snapshot). |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller (owner only), Admin |

**Path Parameters**
| Param | Type |
|---|---|
| `productId` | string |

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Product deleted", "data": null }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 403 | `FORBIDDEN` | Not the owning seller |
| 404 | `NOT_FOUND` | Already deleted / doesn't exist |
| 409 | `CONFLICT` | Product has active (non-final-state) orders — deletion blocked, must deactivate instead |

---

### 3.4 Get Product (Detail)

| | |
|---|---|
| **Method / URL** | `GET /products/:productId` |
| **Description** | Fetches full detail for a single product, including variants, images, rating summary. |
| **Auth Required** | No (public); seller-only fields hidden unless owner/Admin |
| **Roles Allowed** | Public |

**Path Parameters**
| Param | Type | Description |
|---|---|---|
| `productId` | string | Product ID or `slug` (dual-resolution) |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Product fetched",
  "data": {
    "id": "prod_5c9e1a",
    "slug": "wireless-noise-cancelling-headphones-5c9e1a",
    "title": "Wireless Noise Cancelling Headphones",
    "description": "Over-ear headphones with ANC and 40h battery.",
    "category": { "id": "cat_electronics_audio", "name": "Audio" },
    "brand": { "id": "brand_sony", "name": "Sony" },
    "basePrice": 24999,
    "discountPrice": 19999,
    "currency": "INR",
    "stock": 120,
    "rating": { "average": 4.6, "count": 328 },
    "images": [ { "id": "img_1", "url": "https://cdn.../1.webp", "isPrimary": true } ],
    "variants": [ { "id": "var_1", "attributes": { "color": "Black" }, "price": 19999, "stock": 60 } ],
    "seller": { "id": "usr_seller1", "storeName": "Sony Official Store" },
    "status": "ACTIVE",
    "createdAt": "2026-06-01T10:00:00.000Z"
  }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 404 | `NOT_FOUND` | Product doesn't exist / not visible to caller |

---

### 3.5 Get Products (List)

| | |
|---|---|
| **Method / URL** | `GET /products` |
| **Description** | Paginated, filterable, sortable product listing. |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Pagination |
| `limit` | integer | 20 | Max 100 |
| `category` | string | — | Category slug/ID; supports comma-separated |
| `brand` | string | — | Brand slug/ID; comma-separated |
| `minPrice` / `maxPrice` | number | — | Price range filter |
| `minRating` | number | — | 1–5 |
| `inStock` | boolean | — | `true` excludes zero-stock items |
| `tags` | string | — | Comma-separated |
| `sellerId` | string | — | Filter by seller |
| `sortBy` | string | `createdAt` | One of: `price`, `rating`, `createdAt`, `popularity` |
| `order` | string | `desc` | `asc` \| `desc` |
| `q` | string | — | Free-text search (see §1.13) |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Products fetched",
  "data": [ { "id": "prod_5c9e1a", "title": "Wireless Noise Cancelling Headphones", "basePrice": 24999, "discountPrice": 19999, "rating": 4.6, "primaryImage": "https://cdn.../1.webp" } ],
  "meta": { "pagination": { "page": 1, "limit": 20, "totalItems": 154, "totalPages": 8, "hasNextPage": true, "hasPrevPage": false } }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Invalid filter/sort values |

---

### 3.6 Product Variants — Add Variant

| | |
|---|---|
| **Method / URL** | `POST /products/:productId/variants` |
| **Description** | Adds a purchasable variant (e.g. color/size combination) to a product. |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller (owner), Admin |

**Request Body**
```json
{ "attributes": { "color": "Silver", "size": "M" }, "price": 21999, "stock": 40, "sku": "SNY-WH-1000XM5-SLV" }
```

**Validation Rules**
- `attributes`: required, object, at least 1 key.
- `price`: required, decimal > 0.
- `stock`: required, integer ≥ 0.
- `sku`: required, unique.

**Success Response — `201 Created`** — returns created variant object.

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 403 | `FORBIDDEN` | Not owner |
| 404 | `NOT_FOUND` | Product doesn't exist |
| 409 | `CONFLICT` | Duplicate variant attributes or SKU |

### 3.7 Product Variants — Update / Delete Variant

| | |
|---|---|
| **Method / URL** | `PATCH /products/:productId/variants/:variantId` · `DELETE /products/:productId/variants/:variantId` |
| **Description** | Updates variant price/stock/attributes, or removes a variant. |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller (owner), Admin |

**Path Parameters:** `productId`, `variantId`.
**Request Body (PATCH):** any subset of `{ attributes, price, stock, sku }`.
**Success Response:** `200 OK` (update, returns variant) / `200 OK` (delete, `data: null`).
**Error Responses:** `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT` (delete blocked if variant has pending orders).

---

### 3.8 Product Images — Upload

| | |
|---|---|
| **Method / URL** | `POST /products/:productId/images` |
| **Description** | Attaches one or more images to a product (uses pre-uploaded asset URLs from the Uploads module). |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller (owner), Admin |

**Request Body**
```json
{ "images": [ { "url": "https://cdn.../img1.webp", "isPrimary": true, "altText": "Front view" } ] }
```

**Validation Rules**
- `images`: array, 1–10 items.
- `url`: required, must be a `smartcommerce` CDN URL (uploaded via §16.1 first).
- Exactly one image may have `isPrimary: true`.

**Success Response — `201 Created`** — returns array of created image records with `id`.

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 403 | `FORBIDDEN` | Not owner |
| 422 | `VALIDATION_ERROR` | Invalid/non-CDN URL, >1 primary |

### 3.9 Product Images — Delete

| | |
|---|---|
| **Method / URL** | `DELETE /products/:productId/images/:imageId` |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller (owner), Admin |
| **Success Response** | `200 OK`, `data: null` |
| **Error Responses** | `403 FORBIDDEN`, `404 NOT_FOUND` |

---

### 3.10 Product Search

| | |
|---|---|
| **Method / URL** | `GET /products/search` |
| **Description** | Full-text + faceted product search (distinct from AI semantic search, §14.4). |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `q` | string | Required, 2–200 chars |
| `page`, `limit` | integer | Pagination |
| `category`, `brand`, `minPrice`, `maxPrice`, `minRating` | — | Same as §3.5 filters |
| `sortBy` | string | `relevance` (default), `price`, `rating` |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Search results fetched",
  "data": [ { "id": "prod_5c9e1a", "title": "Wireless Noise Cancelling Headphones", "matchScore": 0.94, "basePrice": 24999 } ],
  "meta": { "pagination": { "page": 1, "limit": 20, "totalItems": 12, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false } }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Missing/too-short `q` |

---

### 3.11 Trending Products

| | |
|---|---|
| **Method / URL** | `GET /products/trending` |
| **Description** | Returns top trending products, computed by a scheduled BullMQ job from recent views/purchases (Redis cache, §1.14). |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Query Parameters**
| Param | Type | Default |
|---|---|---|
| `limit` | integer | 10 (max 50) |
| `category` | string | optional filter |

**Success Response — `200 OK`** — array of product summary objects (same shape as §3.5 list items) with an added `trendScore`.

---

### 3.12 Featured Products

| | |
|---|---|
| **Method / URL** | `GET /products/featured` |
| **Description** | Returns Admin/Seller-curated featured products (e.g. homepage banner). |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Query Parameters**
| Param | Type | Default |
|---|---|---|
| `limit` | integer | 10 (max 50) |

**Success Response — `200 OK`** — array of product summary objects with `featuredRank`.

---
## 4. Categories Module

Base path: `/categories`. Supports nested (parent/child) categories via `parentId`.

### 4.1 Create Category

| | |
|---|---|
| **Method / URL** | `POST /categories` |
| **Auth Required** | Yes |
| **Roles Allowed** | Admin |

**Request Body**
```json
{ "name": "Audio", "slug": "audio", "parentId": "cat_electronics", "description": "Headphones, speakers, and more", "imageUrl": "https://cdn.../audio.webp", "isActive": true }
```

**Validation Rules**
- `name`: required, 2–80 chars, unique per `parentId`.
- `slug`: required, unique, lowercase kebab-case (auto-generated from `name` if omitted).
- `parentId`: optional, must reference existing category (max nesting depth: 3).
- `imageUrl`: optional, valid CDN URL.

**Success Response — `201 Created`** — returns category object with `id`.
**Error Responses:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 CONFLICT` (duplicate slug), `422 VALIDATION_ERROR`, `404 NOT_FOUND` (invalid `parentId`).

### 4.2 Update Category

`PATCH /categories/:categoryId` — Admin only. Partial update of §4.1 fields. Same validation + errors.

### 4.3 Delete Category

`DELETE /categories/:categoryId` — Admin only. Soft-delete.
**Error:** `409 CONFLICT` if category has active products or child categories — must be reassigned/emptied first.

### 4.4 Get Category (Detail)

`GET /categories/:categoryId` — Public. Returns category with `breadcrumb` (ancestor chain) and `children[]`.

### 4.5 Get Categories (List / Tree)

| | |
|---|---|
| **Method / URL** | `GET /categories` |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `flat` | boolean | `false` (default) returns nested tree; `true` returns a flat list |
| `parentId` | string | Filter direct children of a given category |
| `isActive` | boolean | Filter active/inactive (Admin context only; public always sees active-only) |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Categories fetched",
  "data": [ { "id": "cat_electronics", "name": "Electronics", "slug": "electronics", "children": [ { "id": "cat_electronics_audio", "name": "Audio", "slug": "audio", "children": [] } ] } ]
}
```
Cached per §1.14 (30 min TTL, invalidated on any write).

---

## 5. Brands Module

Base path: `/brands`

### 5.1 Create Brand

`POST /brands` — Admin only (Sellers may request via a `SELLER` role with `canManageBrands` flag if enabled per platform policy; default: Admin only).

**Request Body**
```json
{ "name": "Sony", "slug": "sony", "logoUrl": "https://cdn.../sony.webp", "description": "Consumer electronics brand", "isActive": true }
```

**Validation Rules:** `name` required unique 2–80 chars; `slug` unique kebab-case; `logoUrl` valid CDN URL.
**Success Response:** `201 Created`, brand object.
**Errors:** `401`, `403`, `409 CONFLICT` (duplicate), `422 VALIDATION_ERROR`.

### 5.2 Update Brand

`PATCH /brands/:brandId` — Admin only. Same validation as §5.1 (partial).

### 5.3 Delete Brand

`DELETE /brands/:brandId` — Admin only. Soft-delete.
**Error:** `409 CONFLICT` if brand has active products.

### 5.4 Get Brand

`GET /brands/:brandId` — Public. Returns brand detail + `productCount`.

### 5.5 Get Brands (List)

| | |
|---|---|
| **Method / URL** | `GET /brands` |
| **Auth Required** | No |

**Query Parameters:** `page`, `limit`, `q` (name search), `isActive`, `sortBy` (`name`\|`createdAt`), `order`.

**Success Response — `200 OK`** — paginated array of brand summary objects.

---
## 6. Wishlist Module

Base path: `/wishlist`

### 6.1 Add to Wishlist

| | |
|---|---|
| **Method / URL** | `POST /wishlist` |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Request Body**
```json
{ "productId": "prod_5c9e1a", "variantId": "var_1" }
```

**Validation Rules:** `productId` required, must exist and be `ACTIVE`; `variantId` optional.
**Success Response — `201 Created`**
```json
{ "success": true, "statusCode": 201, "message": "Added to wishlist", "data": { "wishlistItemId": "wl_1a2b", "productId": "prod_5c9e1a" } }
```
**Errors:** `401 UNAUTHORIZED`, `404 NOT_FOUND` (product), `409 CONFLICT` (already in wishlist).

### 6.2 Remove from Wishlist

`DELETE /wishlist/:wishlistItemId` — Customer (owner only).
**Success:** `200 OK`, `data: null`. **Errors:** `403 FORBIDDEN`, `404 NOT_FOUND`.

### 6.3 Get Wishlist

| | |
|---|---|
| **Method / URL** | `GET /wishlist` |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Query Parameters:** `page`, `limit`.

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Wishlist fetched",
  "data": [ { "wishlistItemId": "wl_1a2b", "product": { "id": "prod_5c9e1a", "title": "Wireless Noise Cancelling Headphones", "discountPrice": 19999, "inStock": true, "primaryImage": "https://cdn.../1.webp" }, "addedAt": "2026-07-20T10:00:00.000Z" } ],
  "meta": { "pagination": { "page": 1, "limit": 20, "totalItems": 4, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false } }
}
```

---

## 7. Cart Module

Base path: `/cart`. Cart is Redis-backed (§1.14), keyed by `userId`; guest carts (future-ready) would key by a signed `cartId` cookie.

### 7.1 Add Item to Cart

| | |
|---|---|
| **Method / URL** | `POST /cart/items` |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Request Body**
```json
{ "productId": "prod_5c9e1a", "variantId": "var_1", "quantity": 2 }
```

**Validation Rules:** `productId` required, exists + active; `variantId` optional but required if product has variants; `quantity` required, integer 1–10, ≤ available stock.

**Success Response — `201 Created`** — returns full updated cart (see §7.5 shape).
**Errors:** `404 NOT_FOUND` (product/variant), `409 CONFLICT` (insufficient stock), `422 VALIDATION_ERROR`.

### 7.2 Update Item Quantity

| | |
|---|---|
| **Method / URL** | `PATCH /cart/items/:cartItemId` |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Request Body**
```json
{ "quantity": 3 }
```
**Validation:** `quantity` required, integer 1–10, ≤ stock. `quantity: 0` is rejected — use the remove endpoint instead.
**Success Response:** `200 OK`, updated cart. **Errors:** `404 NOT_FOUND`, `409 CONFLICT` (stock).

### 7.3 Remove Item

`DELETE /cart/items/:cartItemId` — Customer.
**Success:** `200 OK`, returns updated cart. **Errors:** `404 NOT_FOUND`.

### 7.4 Apply Coupon to Cart

| | |
|---|---|
| **Method / URL** | `POST /cart/coupon` |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Request Body**
```json
{ "code": "WELCOME10" }
```
**Validation:** `code` required; validated against Coupon rules (§15.2 — active, not expired, min-cart-value met, usage limit not exceeded, applicable to items in cart).
**Success Response:** `200 OK`, cart with `discount` applied.
**Errors:** `404 NOT_FOUND` (invalid code), `409 CONFLICT` (expired/limit reached/min value not met — code `COUPON_NOT_APPLICABLE`).

Remove coupon: `DELETE /cart/coupon` — `200 OK`, cart recalculated without discount.

### 7.5 Get Cart

| | |
|---|---|
| **Method / URL** | `GET /cart` |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Cart fetched",
  "data": {
    "items": [ { "cartItemId": "ci_1", "productId": "prod_5c9e1a", "variantId": "var_1", "title": "Wireless Noise Cancelling Headphones", "unitPrice": 19999, "quantity": 2, "subtotal": 39998, "inStock": true } ],
    "coupon": { "code": "WELCOME10", "discountAmount": 4000 },
    "summary": { "itemsTotal": 39998, "discount": 4000, "shippingEstimate": 0, "tax": 6300, "grandTotal": 42298 }
  }
}
```

### 7.6 Clear Cart

`DELETE /cart` — Customer. Removes all items and coupon.
**Success:** `200 OK`, `data: null`.

---
## 8. Checkout Module

Base path: `/checkout`. Orchestrates cart → address/shipping → payment intent → order creation. All state-changing endpoints require `Idempotency-Key`.

### 8.1 Checkout (Initiate / Preview)

| | |
|---|---|
| **Method / URL** | `POST /checkout` |
| **Description** | Validates the cart (stock, pricing, coupon) and returns an order preview + a `checkoutSessionId` used for subsequent payment steps. Does **not** create the order yet. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Headers**
| Header | Required |
|---|---|
| `Idempotency-Key` | Yes |

**Request Body**
```json
{
  "shippingAddressId": "addr_9f1a",
  "billingAddressId": "addr_9f1a",
  "shippingMethod": "STANDARD",
  "paymentProvider": "RAZORPAY"
}
```

**Validation Rules**
- `shippingAddressId`: required, must belong to authenticated user.
- `billingAddressId`: required.
- `shippingMethod`: enum `["STANDARD", "EXPRESS"]`.
- `paymentProvider`: enum `["RAZORPAY", "STRIPE"]`.
- Cart must be non-empty; every item re-validated for current stock/price at this moment (price drift triggers `409 CONFLICT` with corrected cart returned).

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Checkout validated",
  "data": {
    "checkoutSessionId": "chk_7f2a91",
    "orderPreview": { "itemsTotal": 39998, "discount": 4000, "shipping": 99, "tax": 6300, "grandTotal": 42397 },
    "expiresAt": "2026-08-02T09:29:22.000Z"
  }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 404 | `NOT_FOUND` | Invalid address ID |
| 409 | `CONFLICT` | Cart empty, price/stock drift, address undeliverable to |
| 422 | `VALIDATION_ERROR` | Invalid fields |

---

### 8.2 Create Payment Intent

| | |
|---|---|
| **Method / URL** | `POST /checkout/payment-intent` |
| **Description** | Creates a payment intent/order with the selected gateway (Razorpay Order / Stripe PaymentIntent) for a valid checkout session. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Headers:** `Idempotency-Key` (required).

**Request Body**
```json
{ "checkoutSessionId": "chk_7f2a91" }
```

**Success Response — `201 Created`**
```json
{
  "success": true, "statusCode": 201, "message": "Payment intent created",
  "data": {
    "provider": "RAZORPAY",
    "providerOrderId": "order_LZ1x9F3aB",
    "amount": 4239700,
    "currency": "INR",
    "keyId": "rzp_live_xxxxxxxx"
  }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 404 | `NOT_FOUND` | Unknown/expired `checkoutSessionId` |
| 402 | `PAYMENT_FAILED` | Gateway rejected intent creation |
| 409 | `CONFLICT` | Session already has an active intent |

---

### 8.3 Verify Payment

| | |
|---|---|
| **Method / URL** | `POST /checkout/verify-payment` |
| **Description** | Verifies gateway payment signature and, on success, atomically creates the Order (see §9.1 for resulting shape), decrements stock, clears cart. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Headers:** `Idempotency-Key` (required).

**Request Body**
```json
{
  "checkoutSessionId": "chk_7f2a91",
  "provider": "RAZORPAY",
  "providerOrderId": "order_LZ1x9F3aB",
  "providerPaymentId": "pay_LZ1yA0bC",
  "signature": "3f9a2e...c7"
}
```

**Validation Rules:** All fields required; `signature` cryptographically verified server-side against provider secret (HMAC for Razorpay, webhook-secret for Stripe path).

**Success Response — `201 Created`**
```json
{
  "success": true, "statusCode": 201, "message": "Payment verified, order placed",
  "data": { "orderId": "ord_3e9f1c", "orderNumber": "SC-2026-004821", "status": "CONFIRMED", "grandTotal": 42397 }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 402 | `PAYMENT_FAILED` | Signature invalid / payment not captured |
| 404 | `NOT_FOUND` | Unknown session |
| 409 | `CONFLICT` | Stock changed since intent creation (payment auto-refund initiated) |

> **Webhook note:** Razorpay/Stripe webhooks (`POST /checkout/webhook/razorpay`, `POST /checkout/webhook/stripe`) run in parallel as the source of truth for payment state, independently signature-verified (§1.9), and reconcile any client-side verification gaps. Documented separately in the Webhooks appendix of the OpenAPI spec — not user-facing.

---

### 8.4 Cancel Payment

| | |
|---|---|
| **Method / URL** | `POST /checkout/cancel-payment` |
| **Description** | Cancels an in-progress (unpaid) payment intent and releases any soft-held stock. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Request Body**
```json
{ "checkoutSessionId": "chk_7f2a91" }
```

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Payment cancelled", "data": null }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 404 | `NOT_FOUND` | Unknown session |
| 409 | `CONFLICT` | Payment already captured — cannot cancel, use Return/Refund flow instead |

---
## 9. Orders Module

Base path: `/orders`

### 9.1 Create Order

> Orders are created internally by `POST /checkout/verify-payment` (§8.3) as part of the atomic payment-verification transaction. There is **no** direct public `POST /orders` endpoint — this prevents orders from being created without a verified payment. Order status enum: `PENDING_PAYMENT → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`, with side-branches `CANCELLED` and `RETURN_REQUESTED → RETURNED`.

### 9.2 Get Orders (List)

| | |
|---|---|
| **Method / URL** | `GET /orders` |
| **Description** | Lists the authenticated customer's orders (Sellers/Admin use their respective modules — §12.5, §13.x — for cross-user views). |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `page`, `limit` | integer | Pagination |
| `status` | string | Comma-separated status filter |
| `from`, `to` | ISO date | Date range on `createdAt` |
| `sortBy` | string | `createdAt` (default), `grandTotal` |
| `order` | string | `asc`/`desc` |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Orders fetched",
  "data": [ { "orderId": "ord_3e9f1c", "orderNumber": "SC-2026-004821", "status": "SHIPPED", "grandTotal": 42397, "itemCount": 2, "createdAt": "2026-08-01T10:00:00.000Z" } ],
  "meta": { "pagination": { "page": 1, "limit": 20, "totalItems": 6, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false } }
}
```

### 9.3 Order Details

| | |
|---|---|
| **Method / URL** | `GET /orders/:orderId` |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer (owner), Seller (if order contains their product), Admin |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Order fetched",
  "data": {
    "orderId": "ord_3e9f1c", "orderNumber": "SC-2026-004821", "status": "SHIPPED",
    "items": [ { "productId": "prod_5c9e1a", "title": "Wireless Noise Cancelling Headphones", "variant": "Black", "quantity": 2, "unitPrice": 19999, "subtotal": 39998, "sellerId": "usr_seller1" } ],
    "shippingAddress": { "line1": "221B Baker Street", "city": "Indore", "state": "MP", "pincode": "452001", "country": "IN" },
    "payment": { "provider": "RAZORPAY", "status": "CAPTURED", "paidAt": "2026-08-01T10:01:12.000Z" },
    "summary": { "itemsTotal": 39998, "discount": 4000, "shipping": 99, "tax": 6300, "grandTotal": 42397 },
    "timeline": [ { "status": "CONFIRMED", "at": "2026-08-01T10:01:12.000Z" }, { "status": "SHIPPED", "at": "2026-08-02T08:00:00.000Z" } ]
  }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 403 | `FORBIDDEN` | Not owner/related seller/Admin |
| 404 | `NOT_FOUND` | Order doesn't exist |

### 9.4 Cancel Order

| | |
|---|---|
| **Method / URL** | `POST /orders/:orderId/cancel` |
| **Description** | Cancels an order prior to shipment; triggers refund workflow. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer (owner) |

**Request Body**
```json
{ "reason": "Ordered by mistake" }
```
**Validation:** `reason` required, 5–500 chars. Only permitted while status ∈ `{PENDING_PAYMENT, CONFIRMED, PROCESSING}`.

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Order cancelled, refund initiated", "data": { "orderId": "ord_3e9f1c", "status": "CANCELLED", "refundStatus": "INITIATED" } }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 409 | `CONFLICT` | Order already shipped/delivered/cancelled |
| 404 | `NOT_FOUND` | Order doesn't exist |
| 403 | `FORBIDDEN` | Not the owning customer |

### 9.5 Return Order

| | |
|---|---|
| **Method / URL** | `POST /orders/:orderId/return` |
| **Description** | Requests a return for a delivered order (within the return window). |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer (owner) |

**Request Body**
```json
{ "items": [ { "orderItemId": "oi_1", "quantity": 1, "reason": "Defective unit" } ], "returnMethod": "PICKUP" }
```

**Validation Rules:** Only allowed while status `= DELIVERED` and within `returnWindowDays` (product/category-configurable, default 7). `quantity` ≤ ordered quantity. `returnMethod` enum `["PICKUP", "SELF_SHIP"]`.

**Success Response — `201 Created`**
```json
{ "success": true, "statusCode": 201, "message": "Return requested", "data": { "returnId": "ret_8a1c", "status": "RETURN_REQUESTED" } }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 409 | `CONFLICT` | Outside return window / not delivered / already returned |
| 422 | `VALIDATION_ERROR` | Invalid item/quantity |

### 9.6 Track Order

| | |
|---|---|
| **Method / URL** | `GET /orders/:orderId/track` |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer (owner), Admin |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Tracking fetched",
  "data": { "orderId": "ord_3e9f1c", "carrier": "Delhivery", "trackingNumber": "DL482910337IN", "currentStatus": "OUT_FOR_DELIVERY", "estimatedDelivery": "2026-08-03", "history": [ { "status": "SHIPPED", "location": "Mumbai Hub", "at": "2026-08-02T08:00:00.000Z" } ] }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 404 | `NOT_FOUND` | No tracking info yet / order doesn't exist |

---
## 10. Reviews Module

Base path: `/reviews` (nested read also available at `/products/:productId/reviews`)

### 10.1 Add Review

| | |
|---|---|
| **Method / URL** | `POST /products/:productId/reviews` |
| **Description** | Adds a review. Restricted to customers who have a `DELIVERED` order containing this product (verified purchase). |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Request Body**
```json
{ "rating": 5, "title": "Excellent sound quality", "reviewText": "ANC works great, battery lasts all week.", "images": ["https://cdn.../review1.webp"] }
```

**Validation Rules**
- `rating`: required, integer 1–5.
- `title`: required, 5–120 chars.
- `reviewText`: required, 10–2000 chars, sanitized.
- `images`: optional array, max 5 CDN URLs.
- One review per customer per product (enforced via unique constraint).

**Success Response — `201 Created`**
```json
{ "success": true, "statusCode": 201, "message": "Review submitted", "data": { "reviewId": "rev_2f1a", "status": "PUBLISHED" } }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 403 | `FORBIDDEN` | No verified purchase |
| 409 | `CONFLICT` | Already reviewed this product |
| 422 | `VALIDATION_ERROR` | Invalid fields |

### 10.2 Edit Review

`PATCH /reviews/:reviewId` — Customer (author only). Same field validation as §10.1 (partial). Re-enters `PENDING_MODERATION` if platform enforces re-review on edit.
**Errors:** `403 FORBIDDEN`, `404 NOT_FOUND`.

### 10.3 Delete Review

`DELETE /reviews/:reviewId` — Customer (author), Admin (moderation). Soft-delete.
**Success:** `200 OK`, `data: null`. **Errors:** `403 FORBIDDEN`, `404 NOT_FOUND`.

### 10.4 Get Reviews

| | |
|---|---|
| **Method / URL** | `GET /products/:productId/reviews` |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `page`, `limit` | integer | Pagination |
| `rating` | integer | Filter by exact star rating |
| `sortBy` | string | `createdAt` (default), `rating`, `helpfulCount` |
| `order` | string | `asc`/`desc` |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Reviews fetched",
  "data": [ { "reviewId": "rev_2f1a", "author": "John D.", "rating": 5, "title": "Excellent sound quality", "reviewText": "ANC works great...", "verifiedPurchase": true, "helpfulCount": 12, "createdAt": "2026-07-15T10:00:00.000Z" } ],
  "meta": { "pagination": { "page": 1, "limit": 20, "totalItems": 328, "totalPages": 17, "hasNextPage": true, "hasPrevPage": false }, "ratingBreakdown": { "5": 210, "4": 80, "3": 20, "2": 10, "1": 8 } }
}
```

---

## 11. Notifications Module

Base path: `/notifications`

### 11.1 Get Notifications

| | |
|---|---|
| **Method / URL** | `GET /notifications` |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer, Seller, Admin |

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `page`, `limit` | integer | Pagination (cursor pagination also supported: `?cursor=<id>`) |
| `isRead` | boolean | Filter read/unread |
| `type` | string | e.g. `ORDER_UPDATE`, `PRICE_DROP`, `PROMOTION`, `SYSTEM` |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Notifications fetched",
  "data": [ { "id": "ntf_9a1c", "type": "ORDER_UPDATE", "title": "Your order has shipped", "body": "Order SC-2026-004821 is on its way.", "isRead": false, "createdAt": "2026-08-02T08:00:00.000Z" } ],
  "meta": { "pagination": { "page": 1, "limit": 20, "totalItems": 34, "totalPages": 2, "hasNextPage": true, "hasPrevPage": false }, "unreadCount": 5 }
}
```

### 11.2 Mark as Read

| | |
|---|---|
| **Method / URL** | `PATCH /notifications/:notificationId/read` (single) · `PATCH /notifications/read-all` (bulk) |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer, Seller, Admin |

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Notification marked as read", "data": null }
```
**Errors:** `403 FORBIDDEN` (not owner), `404 NOT_FOUND`.

### 11.3 Delete Notification

`DELETE /notifications/:notificationId` — owner only.
**Success:** `200 OK`, `data: null`. **Errors:** `403 FORBIDDEN`, `404 NOT_FOUND`.

---
## 12. Seller Module

Base path: `/seller`. All endpoints scoped to the authenticated seller's own store (no cross-seller access).

### 12.1 Seller Dashboard

| | |
|---|---|
| **Method / URL** | `GET /seller/dashboard` |
| **Description** | Aggregated at-a-glance metrics for the seller's home screen. |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller |

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `range` | string | `7d` | `today`\|`7d`\|`30d`\|`90d`\|`custom` |
| `from`, `to` | ISO date | — | Required if `range=custom` |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Dashboard fetched",
  "data": {
    "revenue": { "amount": 184250, "changePct": 12.4 },
    "orders": { "count": 96, "changePct": 8.1 },
    "pendingOrders": 7,
    "activeProducts": 42,
    "lowStockAlerts": 3,
    "rating": { "average": 4.5, "count": 512 }
  }
}
```
**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN` (non-seller), `422 VALIDATION_ERROR` (bad range).

### 12.2 Seller Analytics

| | |
|---|---|
| **Method / URL** | `GET /seller/analytics` |
| **Description** | Time-series and breakdown analytics for charts (sales trend, top products, traffic sources). |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller |

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `range` | string | `7d`\|`30d`\|`90d`\|`1y`\|`custom` |
| `from`, `to` | ISO date | Required if `range=custom` |
| `metric` | string | `revenue`\|`orders`\|`views`\|`conversionRate` (default `revenue`) |
| `granularity` | string | `day`\|`week`\|`month` (default `day`) |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Analytics fetched",
  "data": {
    "series": [ { "date": "2026-07-27", "value": 24100 }, { "date": "2026-07-28", "value": 31200 } ],
    "topProducts": [ { "productId": "prod_5c9e1a", "title": "Wireless Noise Cancelling Headphones", "unitsSold": 58, "revenue": 1159942 } ]
  }
}
```

### 12.3 Seller Inventory

| | |
|---|---|
| **Method / URL** | `GET /seller/inventory` |
| **Description** | Stock-focused product listing with low-stock/out-of-stock flags. |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller |

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `page`, `limit` | integer | Pagination |
| `stockStatus` | string | `IN_STOCK`\|`LOW_STOCK`\|`OUT_OF_STOCK` |
| `q` | string | Search by title/SKU |
| `sortBy` | string | `stock`(default)\|`title`\|`updatedAt` |
| `order` | string | `asc`/`desc` |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Inventory fetched",
  "data": [ { "productId": "prod_5c9e1a", "sku": "SNY-WH-1000XM5", "title": "Wireless Noise Cancelling Headphones", "stock": 4, "stockStatus": "LOW_STOCK" } ],
  "meta": { "pagination": { "page": 1, "limit": 20, "totalItems": 42, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false } }
}
```

**Bulk update:** `PATCH /seller/inventory` — body `{ "updates": [{ "productId": "...", "stock": 50 }] }`, max 100 items/request. Returns per-item success/failure array.

### 12.4 Seller Revenue

| | |
|---|---|
| **Method / URL** | `GET /seller/revenue` |
| **Description** | Detailed revenue/payout ledger. |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller |

**Query Parameters:** `page`, `limit`, `range`/`from`/`to`, `payoutStatus` (`PENDING`\|`PROCESSED`\|`FAILED`).

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Revenue fetched",
  "data": {
    "summary": { "grossRevenue": 1184250, "platformFee": 59212, "netPayable": 1125038, "alreadyPaidOut": 900000, "pendingPayout": 225038 },
    "entries": [ { "orderId": "ord_3e9f1c", "orderNumber": "SC-2026-004821", "grossAmount": 39998, "platformFee": 1999, "netAmount": 37999, "payoutStatus": "PENDING", "createdAt": "2026-08-01T10:00:00.000Z" } ]
  },
  "meta": { "pagination": { "page": 1, "limit": 20, "totalItems": 96, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false } }
}
```

### 12.5 Seller Orders

| | |
|---|---|
| **Method / URL** | `GET /seller/orders` |
| **Description** | Orders containing at least one of this seller's products. |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller |

**Query Parameters:** `page`, `limit`, `status` (comma-separated), `from`/`to`, `sortBy` (`createdAt`\|`grandTotal`), `order`.

**Success Response — `200 OK`** — array shaped like §9.2 list items, scoped to seller's line items only.

**Update fulfillment status:** `PATCH /seller/orders/:orderId/fulfillment`
```json
{ "status": "SHIPPED", "carrier": "Delhivery", "trackingNumber": "DL482910337IN" }
```
Validation: `status` enum `["PROCESSING","SHIPPED"]` (seller cannot set `DELIVERED`/`CANCELLED` directly — those are system/courier-webhook or customer-driven). **Errors:** `403 FORBIDDEN` (order doesn't include seller's items), `409 CONFLICT` (invalid state transition).

---

## 13. Admin Module

Base path: `/admin`. All endpoints require Admin role; all mutating actions are written to `AuditLog` (§1.9).

### 13.1 Admin Dashboard

`GET /admin/dashboard` — platform-wide KPIs: GMV, active users, active sellers, pending moderation count, open disputes.
Query: `range`/`from`/`to` (as §12.1).
**Success:** `200 OK`, aggregate object.

### 13.2 User Management

| | |
|---|---|
| **Method / URL** | `GET /admin/users` |
| **Auth Required** | Yes |
| **Roles Allowed** | Admin |

**Query Parameters:** `page`, `limit`, `q` (name/email search), `role` (`CUSTOMER`\|`SELLER`\|`ADMIN`), `status` (`ACTIVE`\|`SUSPENDED`), `sortBy` (`createdAt`\|`fullName`), `order`.

**Success Response — `200 OK`** — paginated array of user summary objects.

**Get single:** `GET /admin/users/:userId` — full profile + order/review counts.

**Suspend/Reactivate:** `PATCH /admin/users/:userId/status`
```json
{ "status": "SUSPENDED", "reason": "Repeated policy violations" }
```
Validation: `status` enum `["ACTIVE","SUSPENDED"]`; `reason` required when suspending, 10–500 chars.
**Errors:** `404 NOT_FOUND`, `422 VALIDATION_ERROR`, `409 CONFLICT` (cannot suspend another Admin via this route).

### 13.3 Seller Management

| | |
|---|---|
| **Method / URL** | `GET /admin/sellers` |
| **Auth Required** | Yes |
| **Roles Allowed** | Admin |

**Query Parameters:** `page`, `limit`, `q`, `status` (`PENDING_APPROVAL`\|`APPROVED`\|`SUSPENDED`), `sortBy`, `order`.

**Approve/Reject seller application:** `PATCH /admin/sellers/:sellerId/approval`
```json
{ "decision": "APPROVED", "notes": "KYC verified" }
```
Validation: `decision` enum `["APPROVED","REJECTED"]`; `notes` optional, required if rejected.
**Errors:** `404 NOT_FOUND`, `409 CONFLICT` (already decided), `422 VALIDATION_ERROR`.

### 13.4 Product Moderation

| | |
|---|---|
| **Method / URL** | `GET /admin/products/moderation-queue` |
| **Description** | Lists products in `PENDING_REVIEW` status (see §3.1). |
| **Auth Required** | Yes |
| **Roles Allowed** | Admin |

**Query Parameters:** `page`, `limit`, `sellerId`, `sortBy` (`createdAt`), `order`.

**Approve/Reject:** `PATCH /admin/products/:productId/moderation`
```json
{ "decision": "REJECTED", "reason": "Misleading title / prohibited category" }
```
Validation: `decision` enum `["APPROVED","REJECTED"]`; `reason` required if rejected, 10–500 chars.
**Success:** `200 OK`, updated product status. **Errors:** `404 NOT_FOUND`, `409 CONFLICT` (not in `PENDING_REVIEW`), `422 VALIDATION_ERROR`.

### 13.5 Admin — Categories

Full CRUD proxy to §4.1–§4.5 under Admin authority — same contracts, listed here for module completeness. No separate `/admin/categories` routes; Admin uses `/categories` directly (role check already permits it).

### 13.6 Admin — Coupons

Full CRUD — see §15.2. Admin uses `/coupons` directly.

### 13.7 Reports

| | |
|---|---|
| **Method / URL** | `GET /admin/reports` |
| **Description** | Generates/exports platform reports (sales, seller performance, tax, refunds). |
| **Auth Required** | Yes |
| **Roles Allowed** | Admin |

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `type` | string | Required: `SALES`\|`SELLER_PERFORMANCE`\|`REFUNDS`\|`TAX` |
| `from`, `to` | ISO date | Required |
| `format` | string | `json` (default) \| `csv` |

**Success Response — `200 OK`** (`format=json`) — structured report object.
**Success Response — `200 OK`** (`format=csv`) — `Content-Type: text/csv`, streamed file, `Content-Disposition: attachment; filename="sales-report-2026-08.csv"`.

**Errors:** `422 VALIDATION_ERROR` (invalid type/date range too large — max 1 year window).

### 13.8 Platform Settings

| | |
|---|---|
| **Method / URL** | `GET /admin/settings` · `PATCH /admin/settings` |
| **Description** | Global configuration: commission %, tax rates, return window defaults, feature flags. |
| **Auth Required** | Yes |
| **Roles Allowed** | Admin |

**Request Body (PATCH)** — partial update:
```json
{ "platformCommissionPct": 5, "defaultReturnWindowDays": 7, "maintenanceMode": false }
```
**Validation:** `platformCommissionPct` 0–100; `defaultReturnWindowDays` integer ≥ 0; changes logged to `AuditLog` with before/after diff.
**Success:** `200 OK`, updated settings object. **Errors:** `422 VALIDATION_ERROR`.

---
## 14. AI Module

Base path: `/ai`. Backed by Gemini/OpenAI (§ tech stack), with Redis response caching (§1.14) and soft-degradation on provider timeout (§1.17). All AI endpoints are rate-limited more aggressively (§1.5) due to cost.

### 14.1 AI Shopping Assistant

| | |
|---|---|
| **Method / URL** | `POST /ai/assistant` |
| **Description** | Conversational assistant that answers shopping questions, suggests products, and can be grounded in the user's cart/order history. |
| **Auth Required** | Yes (optional-auth also supported for anonymous browsing sessions — reduced context) |
| **Roles Allowed** | Customer |

**Request Body**
```json
{
  "conversationId": "conv_7a1b",
  "message": "I need wireless headphones under 20000 for the gym, sweat resistant",
  "context": { "includeCartHistory": true }
}
```

**Validation Rules**
- `message`: required, 1–1000 chars, sanitized.
- `conversationId`: optional (omit to start a new conversation).
- `context.includeCartHistory`: boolean, default `false`.

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Response generated",
  "data": {
    "conversationId": "conv_7a1b",
    "reply": "Here are a few sweat-resistant options under ₹20,000 that suit gym use...",
    "suggestedProducts": [ { "productId": "prod_5c9e1a", "title": "Wireless Noise Cancelling Headphones", "discountPrice": 19999 } ]
  }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 429 | `RATE_LIMITED` | AI quota exceeded |
| 503 | `SERVICE_UNAVAILABLE` | AI provider timeout/down (fallback: cached generic reply) |
| 422 | `VALIDATION_ERROR` | Empty/too-long message |

---

### 14.2 AI Product Recommendation

| | |
|---|---|
| **Method / URL** | `GET /ai/recommendations` |
| **Description** | Personalized recommendations using embeddings (pgvector) over browsing/purchase history; falls back to Trending (§3.11) if insufficient history. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 10 | Max 50 |
| `context` | string | `home` | `home`\|`cart`\|`product_detail` |
| `productId` | string | — | Required if `context=product_detail` ("similar to this") |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Recommendations fetched",
  "data": [ { "productId": "prod_5c9e1a", "title": "Wireless Noise Cancelling Headphones", "reason": "Based on your recent audio-gear views", "score": 0.91 } ]
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Missing `productId` for `product_detail` context |
| 503 | `SERVICE_UNAVAILABLE` | Falls back to Trending instead of erroring where possible |

---

### 14.3 AI Product Comparison

| | |
|---|---|
| **Method / URL** | `POST /ai/compare` |
| **Description** | Generates an AI-written comparison summary across 2–4 products. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Request Body**
```json
{ "productIds": ["prod_5c9e1a", "prod_7b2f4d"] }
```

**Validation Rules:** `productIds`: array, 2–4 items, all must exist and be `ACTIVE`.

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Comparison generated",
  "data": {
    "summary": "The Sony WH-1000XM5 offers superior ANC, while the alternative has a longer battery life...",
    "attributeMatrix": [ { "attribute": "Battery Life", "prod_5c9e1a": "40h", "prod_7b2f4d": "60h" } ],
    "recommendation": { "productId": "prod_5c9e1a", "reason": "Best for frequent flyers prioritizing ANC" }
  }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 404 | `NOT_FOUND` | One or more product IDs invalid |
| 422 | `VALIDATION_ERROR` | Wrong array size |

---

### 14.4 AI Search

| | |
|---|---|
| **Method / URL** | `GET /ai/search` |
| **Description** | Semantic/natural-language product search using vector similarity (distinct from keyword search, §3.10). |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `q` | string | Required, natural-language query, 2–300 chars |
| `limit` | integer | Default 20, max 50 |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "AI search results",
  "data": [ { "productId": "prod_5c9e1a", "title": "Wireless Noise Cancelling Headphones", "matchScore": 0.88, "matchReason": "Matches 'sweat resistant gym headphones'" } ]
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Missing/too-short `q` |
| 503 | `SERVICE_UNAVAILABLE` | Falls back to keyword search (§3.10) |

---

### 14.5 AI Review Summary

| | |
|---|---|
| **Method / URL** | `GET /products/:productId/reviews/ai-summary` |
| **Description** | AI-generated summary of a product's reviews (pros/cons, sentiment breakdown). Cached 24h per product, invalidated on review-volume threshold. |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Review summary generated",
  "data": {
    "sentiment": { "positive": 0.82, "neutral": 0.11, "negative": 0.07 },
    "pros": ["Excellent noise cancellation", "Comfortable for long sessions"],
    "cons": ["Slightly bulky case"],
    "summary": "Most buyers highlight the ANC quality and battery life, with minor complaints about case size."
  }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 404 | `NOT_FOUND` | Product doesn't exist |
| 409 | `CONFLICT` | Fewer than 5 reviews — insufficient data (returns `data: null` with `message`, not an error, per soft-degrade policy) |

---

### 14.6 AI Price Prediction

| | |
|---|---|
| **Method / URL** | `GET /ai/price-prediction/:productId` |
| **Description** | Predicts likely future price movement / best-time-to-buy signal, based on historical price + demand data. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Price prediction generated",
  "data": { "productId": "prod_5c9e1a", "currentPrice": 19999, "predictedTrend": "LIKELY_TO_DROP", "confidence": 0.71, "suggestedAction": "Consider waiting ~2 weeks for a potential price drop", "predictionWindow": "14d" }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 404 | `NOT_FOUND` | Product doesn't exist |
| 409 | `CONFLICT` | Insufficient price history (< 30 days of data) |

---
## 15. Coupons Module

Base path: `/coupons`

### 15.1 Validate Coupon

| | |
|---|---|
| **Method / URL** | `POST /coupons/validate` |
| **Description** | Checks whether a code is currently valid **without** applying it (used for live-typing feedback in checkout UI). |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Request Body**
```json
{ "code": "WELCOME10" }
```

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Coupon is valid", "data": { "code": "WELCOME10", "type": "PERCENTAGE", "value": 10, "maxDiscount": 4000, "minCartValue": 1000 } }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 404 | `NOT_FOUND` | Code doesn't exist |
| 409 | `CONFLICT` | Expired / usage limit reached / not applicable to user (`COUPON_NOT_APPLICABLE`) |

### 15.2 Apply Coupon

> Applying a coupon to an active cart is documented in §7.4 (`POST /cart/coupon`). This section covers coupon **management** (CRUD), performed by Sellers (own coupons) and Admin (platform-wide).

### 15.3 Create Coupon

| | |
|---|---|
| **Method / URL** | `POST /coupons` |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller (scoped to own products), Admin (platform-wide) |

**Request Body**
```json
{
  "code": "WELCOME10",
  "type": "PERCENTAGE",
  "value": 10,
  "maxDiscount": 4000,
  "minCartValue": 1000,
  "usageLimit": 1000,
  "perUserLimit": 1,
  "applicableProductIds": [],
  "applicableCategoryIds": [],
  "startsAt": "2026-08-01T00:00:00.000Z",
  "expiresAt": "2026-09-01T00:00:00.000Z",
  "isActive": true
}
```

**Validation Rules**
- `code`: required, unique, 3–20 chars, uppercase alphanumeric.
- `type`: enum `["PERCENTAGE", "FLAT"]`.
- `value`: required, > 0; if `PERCENTAGE`, ≤ 100.
- `maxDiscount`: required if `type=PERCENTAGE`.
- `minCartValue`: ≥ 0.
- `usageLimit`, `perUserLimit`: integers ≥ 1.
- `applicableProductIds`/`applicableCategoryIds`: optional arrays; empty = applies platform/store-wide.
- `startsAt` < `expiresAt`, both required.
- Sellers may only scope `applicableProductIds` to their own products.

**Success Response — `201 Created`** — coupon object with `id`.
**Errors:** `403 FORBIDDEN` (seller scoping violation), `409 CONFLICT` (duplicate code), `422 VALIDATION_ERROR`.

### 15.4 Update Coupon

`PATCH /coupons/:couponId` — Seller (owner)/Admin. Partial update, same rules. **Errors:** `403`, `404`, `409`, `422`.

### 15.5 Delete Coupon

`DELETE /coupons/:couponId` — Seller (owner)/Admin. Soft-delete (deactivates; historical redemptions retained).
**Errors:** `403 FORBIDDEN`, `404 NOT_FOUND`.

### 15.6 Get Coupons (List)

| | |
|---|---|
| **Method / URL** | `GET /coupons` |
| **Auth Required** | Yes |
| **Roles Allowed** | Seller (own), Admin (all) |

**Query Parameters:** `page`, `limit`, `isActive`, `q` (code search), `sortBy` (`createdAt`\|`expiresAt`), `order`.
**Success Response — `200 OK`** — paginated coupon list.

### 15.7 Get Coupon (Detail)

`GET /coupons/:couponId` — Seller (owner)/Admin. Returns coupon + `redemptionCount`/`redemptionHistory` summary.
**Errors:** `403 FORBIDDEN`, `404 NOT_FOUND`.

---

## 16. Uploads Module

Base path: `/uploads`. Files are streamed to object storage (S3-compatible); this API returns CDN URLs for use in Product Images (§3.8), Reviews (§10.1), Avatars (§2.10).

### 16.1 Upload Image

| | |
|---|---|
| **Method / URL** | `POST /uploads/image` |
| **Description** | Uploads a single image (multipart), returns a permanent CDN URL. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer, Seller, Admin |

**Headers**
| Header | Required | Description |
|---|---|---|
| `Authorization: Bearer <token>` | Yes | |
| `Content-Type: multipart/form-data` | Yes | |

**Request Body (multipart form fields)**
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | binary | Yes | Image file |
| `purpose` | string | Yes | `PRODUCT`\|`REVIEW`\|`AVATAR` — determines storage bucket/CDN path and downstream size limits |

**Validation Rules**
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
- Max size: 5 MB (`PRODUCT`/`REVIEW`), 2 MB (`AVATAR`).
- Images are re-encoded to WebP and virus-scanned server-side before a URL is returned.

**Success Response — `201 Created`**
```json
{ "success": true, "statusCode": 201, "message": "Image uploaded", "data": { "url": "https://cdn.smartcommerce.io/products/img_9f1a2b.webp", "width": 1200, "height": 1200, "sizeBytes": 184320 } }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Wrong MIME type / oversized / missing `purpose` |
| 429 | `RATE_LIMITED` | Too many uploads |
| 500 | `INTERNAL_ERROR` | Storage provider failure |

### 16.2 Delete Image

| | |
|---|---|
| **Method / URL** | `DELETE /uploads/image` |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer, Seller, Admin (owner of the asset only) |

**Request Body**
```json
{ "url": "https://cdn.smartcommerce.io/products/img_9f1a2b.webp" }
```

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Image deleted", "data": null }
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 403 | `FORBIDDEN` | Not the uploader |
| 404 | `NOT_FOUND` | Asset doesn't exist |
| 409 | `CONFLICT` | Image still referenced by an active product/review (must detach first) |

---
## 17. Search Module

Base path: `/search`. Global cross-entity search, distinct from resource-scoped search (§3.10 Products, §14.4 AI Search).

### 17.1 Global Search

| | |
|---|---|
| **Method / URL** | `GET /search` |
| **Description** | Searches across Products, Categories, Brands, and (for Sellers/Admin) Orders in one call — used for the top-nav search bar with grouped results. |
| **Auth Required** | No (Order results only included when authenticated) |
| **Roles Allowed** | Public (tiered results by role) |

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `q` | string | Required, 2–200 chars |
| `types` | string | Comma-separated entity filter: `products,categories,brands,orders`. Default: `products,categories,brands` |
| `limit` | integer | Per-type result cap, default 5, max 20 |

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Search results",
  "data": {
    "products": [ { "id": "prod_5c9e1a", "title": "Wireless Noise Cancelling Headphones", "matchScore": 0.95 } ],
    "categories": [ { "id": "cat_electronics_audio", "name": "Audio" } ],
    "brands": [ { "id": "brand_sony", "name": "Sony" } ]
  }
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Missing/too-short `q`, invalid `types` value |

### 17.2 Search Autocomplete / Typeahead

| | |
|---|---|
| **Method / URL** | `GET /search/suggestions` |
| **Description** | Lightweight, low-latency suggestions as the user types (product titles, categories, trending queries). |
| **Auth Required** | No |
| **Roles Allowed** | Public |

**Query Parameters:** `q` (required, 1–100 chars).

**Success Response — `200 OK`**
```json
{ "success": true, "statusCode": 200, "message": "Suggestions fetched", "data": ["wireless headphones", "wireless mouse", "wireless earbuds"] }
```

### 17.3 Voice Search *(Future)*

| | |
|---|---|
| **Method / URL** | `POST /search/voice` |
| **Description** | Accepts an audio clip, transcribes via speech-to-text, then runs Global Search (§17.1). **Not implemented in v1** — reserved contract for forward compatibility. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Request Body (multipart):** `audio` (binary, ≤ 10s, `audio/webm`/`audio/wav`).
**Planned Response:** same shape as §17.1, plus `transcribedQuery`.
**Status:** `501 Not Implemented` until GA.

### 17.4 Image Search *(Future)*

| | |
|---|---|
| **Method / URL** | `POST /search/image` |
| **Description** | Accepts a product photo, returns visually similar catalog items via embedding similarity. **Not implemented in v1** — reserved contract. |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Request Body (multipart):** `image` (binary, ≤ 5MB).
**Planned Response:** array of product summaries with `visualSimilarityScore`.
**Status:** `501 Not Implemented` until GA.

---

## 18. Analytics Module

Base path: `/analytics`. Complements the embedded metrics in Seller (§12.1–12.2) and Admin (§13.1) modules with dedicated, more granular endpoints for dashboards/BI export.

### 18.1 Customer Analytics

| | |
|---|---|
| **Method / URL** | `GET /analytics/customer` |
| **Description** | Personal shopping insights for the logged-in customer (spend trend, category breakdown). |
| **Auth Required** | Yes |
| **Roles Allowed** | Customer |

**Query Parameters:** `range` (`30d`\|`90d`\|`1y`, default `90d`).

**Success Response — `200 OK`**
```json
{
  "success": true, "statusCode": 200, "message": "Customer analytics fetched",
  "data": { "totalSpend": 142380, "orderCount": 9, "topCategories": [ { "category": "Electronics", "spend": 89210 } ], "avgOrderValue": 15820 }
}
```

### 18.2 Seller Analytics

> Covered by §12.2 (`GET /seller/analytics`). Referenced here for module-index completeness — no duplicate route.

### 18.3 Admin Analytics

| | |
|---|---|
| **Method / URL** | `GET /analytics/admin` |
| **Description** | Platform-wide BI metrics beyond the dashboard summary (§13.1): cohort retention, category performance, seller leaderboard, AI feature usage/cost. |
| **Auth Required** | Yes |
| **Roles Allowed** | Admin |

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `metric` | string | Required: `RETENTION`\|`CATEGORY_PERFORMANCE`\|`SELLER_LEADERBOARD`\|`AI_USAGE` |
| `range` | string | `30d`\|`90d`\|`1y`\|`custom` |
| `from`, `to` | ISO date | Required if `range=custom` |

**Success Response — `200 OK`** (`metric=SELLER_LEADERBOARD` example)
```json
{
  "success": true, "statusCode": 200, "message": "Admin analytics fetched",
  "data": [ { "sellerId": "usr_seller1", "storeName": "Sony Official Store", "revenue": 1184250, "orderCount": 96, "rating": 4.5 } ]
}
```

**Error Responses**
| Status | Code | Scenario |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Invalid/missing `metric`, bad custom range |

---

## Appendix A — HTTP Status Code Reference

| Code | Usage |
|---|---|
| 200 | Successful GET/PATCH/DELETE/action |
| 201 | Successful resource creation |
| 204 | Reserved (not used — this API always returns a body per §1.2) |
| 400 | Malformed request syntax |
| 401 | Missing/invalid/expired credentials |
| 402 | Payment failed/declined |
| 403 | Authenticated but not authorized (role/ownership) |
| 404 | Resource not found |
| 409 | State conflict (duplicate, invalid transition, stock/version conflict) |
| 422 | Semantic validation failure |
| 423 | Resource/account locked |
| 429 | Rate limit exceeded |
| 500 | Unhandled server error |
| 501 | Not implemented (reserved future endpoints, §17.3–17.4) |
| 503 | Downstream dependency unavailable |

## Appendix B — Role Access Summary

| Module | Customer | Seller | Admin |
|---|---|---|---|
| Auth | ✅ (own account) | ✅ (own account) | ✅ (own account) |
| Products | Read-only | Full CRUD (own) | Full CRUD (all) + moderation |
| Categories/Brands | Read-only | Read-only | Full CRUD |
| Wishlist/Cart | ✅ | ❌ | ❌ |
| Checkout/Orders | ✅ (own) | Read (own line items) + fulfillment update | Full read |
| Reviews | ✅ (own, verified purchase) | Read-only | Moderate/delete |
| Notifications | ✅ (own) | ✅ (own) | ✅ (own) |
| Seller module | ❌ | ✅ (own store) | ❌ (uses Admin module instead) |
| Admin module | ❌ | ❌ | ✅ |
| AI | ✅ | — (future: seller-facing AI tools) | — |
| Coupons | Read/validate | CRUD (own) | CRUD (all) |
| Uploads | ✅ (own assets) | ✅ (own assets) | ✅ (own assets) |
| Search | ✅ Public | ✅ Public | ✅ Public |
| Analytics | ✅ (own) | ✅ (own, via Seller module) | ✅ (platform-wide) |

---

*End of specification. This document is the source of truth for the OpenAPI 3.1 spec (§1.16) and should be updated in the same PR as any route change.*