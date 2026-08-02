# Smart Commerce Platform — Complete UI/UX Design System

**Direction:** Apple's material honesty × Stripe's precision × Linear's density-with-calm × Vercel's typographic confidence.
**Tech context:** React + TypeScript + Tailwind + Shadcn, deployed on Vercel — so the visual language is built to map cleanly onto that stack.

---

## 0. Design Philosophy

Five rules govern every screen in this system:

1. **Content is the interface.** Product photography, prices, and data are the hero — chrome (cards, borders, shadows) stays quiet so commerce content stays loud.
2. **One accent, disciplined.** A single electric-indigo accent carries all "this is interactive / this is AI" meaning. It is never diluted by a second competing bright color.
3. **Glass is a signal, not a texture.** Glassmorphism is reserved for exactly three surfaces — command palette, notification drawer, and the AI assistant panel — so that when it appears, it *means* "floating system layer," not "decoration."
4. **Motion explains state changes, it doesn't perform.** Every animation answers "where did this come from / where did it go." Nothing loops, bounces, or plays for attention.
5. **No cartoon UI.** No mascots, no blob illustrations, no emoji as UI elements, no rainbow gradients, no drop-shadow-heavy 3D icons. Icons are line-based (Lucide/Phosphor style, 1.5px stroke), illustrations (where used) are geometric and monochrome-tinted.

---

## 1. Design Tokens

### 1.1 Color Palette

**Light mode**

| Token | Hex | Use |
|---|---|---|
| `bg-canvas` | `#FAFAFA` | App background |
| `bg-surface` | `#FFFFFF` | Cards, panels |
| `bg-muted` | `#F2F2F5` | Inset sections, table stripes |
| `border-subtle` | `#E7E7EB` | Hairline dividers |
| `border-default` | `#D9D9E0` | Input borders |
| `text-primary` | `#111114` | Headlines, body |
| `text-secondary` | `#5B5B66` | Supporting text |
| `text-tertiary` | `#9494A0` | Placeholder, disabled |
| `brand-indigo` | `#5B5FEF` | Primary accent — CTAs, links, focus rings, AI markers |
| `brand-indigo-hover` | `#4A4EDB` | Hover/active state of primary |
| `brand-indigo-tint` | `#EEEEFD` | Selected rows, active nav, subtle backgrounds |
| `commerce-teal` | `#0FA598` | Price/stock positive signals, "in stock," savings badges |
| `success` | `#16A34A` | Confirmations, delivered status |
| `warning` | `#D97706` | Low stock, pending states |
| `danger` | `#DC2626` | Errors, out of stock, destructive actions |

**Dark mode** (not an inverted light mode — tuned separately, per Linear's approach)

| Token | Hex | Use |
|---|---|---|
| `bg-canvas` | `#0B0B0F` | App background |
| `bg-surface` | `#141417` | Cards, panels |
| `bg-elevated` | `#1C1C21` | Modals, dropdowns |
| `border-subtle` | `#232328` | Hairline dividers |
| `text-primary` | `#F2F2F5` | Headlines, body |
| `text-secondary` | `#A3A3AD` | Supporting text |
| `brand-indigo` | `#7B7FFF` | Brightened for dark contrast |
| `brand-indigo-tint` | `#1B1B3A` | Selected/active surfaces |
| `commerce-teal` | `#2DD4C4` | Brightened for dark contrast |

**Glass tokens** (only for the three reserved surfaces — command palette, notification drawer, AI panel)

- Light: `rgba(255,255,255,0.72)` fill, `backdrop-blur(20px)`, `1px solid rgba(255,255,255,0.4)` border, soft 24px shadow at 8% opacity.
- Dark: `rgba(20,20,24,0.65)` fill, `backdrop-blur(20px)`, `1px solid rgba(255,255,255,0.08)` border.

Rationale for the palette: indigo reads as "intelligent/technical" without tipping into the generic SaaS violet-gradient cliché, because it's used as a flat, unshaded accent, never as a gradient background. Teal is borrowed from commerce (think price-drop green) but shifted cooler so it doesn't clash with indigo. No cream, no near-black-plus-neon default — canvas is a true neutral gray-white, not warm.

### 1.2 Typography

Three-role system:

- **Display / headings — Geist Sans** (Vercel's typeface). Used for H1–H3, dashboard numbers, product prices. Weights: 600 (headings), 700 (hero only). Chosen because its geometric, slightly condensed letterforms read as "product/technical," matching the AI-commerce positioning, and it renders natively well against the rest of the stack.
- **Body / UI text — Inter**. Used for paragraphs, labels, buttons, nav. Weights: 400 (body), 500 (labels/buttons), 600 (emphasis).
- **Data / mono — JetBrains Mono**. Reserved for order IDs, SKUs, prices in tables, timestamps, API keys (seller/admin). This is what gives the product its "Stripe dashboard" credibility — numbers that need to be scanned or copied are always monospaced.

**Type scale** (px / line-height):

| Role | Size | Line height | Weight |
|---|---|---|---|
| Display XL (landing hero) | 64 | 68 | 700 Geist |
| H1 | 40 | 46 | 600 Geist |
| H2 | 28 | 34 | 600 Geist |
| H3 | 20 | 28 | 600 Geist |
| Body Large | 17 | 26 | 400 Inter |
| Body | 15 | 22 | 400 Inter |
| Small / caption | 13 | 18 | 400–500 Inter |
| Mono data | 14 | 20 | 500 JetBrains Mono |

Letter-spacing: headings −0.02em (tightened, Apple-style), body 0, mono +0.01em (improves scanability of IDs).

### 1.3 Spacing & Grid

4px base unit. Scale: **4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128**.

- Card padding: 24 (mobile 16).
- Section vertical rhythm (landing): 96–128 between major sections.
- Component internal gaps: 8 (tight, icon+label), 12 (form fields), 16 (card content blocks).
- Grid: 12-column, 1280px max content width on desktop, 24px gutters; 4-column, 16px gutters on mobile.

### 1.4 Radius, Elevation, Border

- Radius scale: `sm` 6px (inputs, badges), `md` 10px (buttons, cards), `lg` 16px (modals, product cards), `full` (avatars, pills). No 24px+ "bubbly" radii anywhere — this is what keeps the system from reading as consumer/cartoon.
- Elevation is mostly done with **borders, not shadows** (Linear-style): `1px solid border-subtle` is the default card treatment. Shadows appear only on elements that actually float above content: dropdowns, modals, toasts, the glass surfaces. Standard floating shadow: `0 8px 24px rgba(17,17,20,0.08)`.

### 1.5 Motion

- Duration: micro-interactions 120–160ms, panel/drawer transitions 200–260ms, page transitions 300ms max.
- Easing: `cubic-bezier(0.2, 0, 0, 1)` — a custom "decelerate" curve (Apple-like snap-in, no bounce/overshoot).
- Signature motion: **the AI Confidence Ribbon** — a 2px hairline underline that draws itself left-to-right under any AI-generated recommendation, price prediction, or search result, at 400ms, once, on first view. This is the system's one recurring "signature" motion — it visually marks "this came from the model" without a badge or icon, and never repeats/loops.
- Respect `prefers-reduced-motion`: all transform/opacity transitions collapse to instant or 80ms fade.

---

## 2. Component Library

Core primitives (built on Shadcn, restyled to tokens above):

- **Buttons** — Primary (solid indigo, white text), Secondary (1px border, transparent), Ghost (no border, text-only), Destructive (danger red, used only for delete/cancel). All buttons: 10px radius, 500 weight Inter, 40px height default / 32px compact / 48px large. Hover = 6% darken; active = 10% darken + 1px scale-down (98%) for tactile feedback.
- **Inputs** — 1px border-default, 10px radius, 40px height, focus = 2px indigo ring + border turns indigo (no glow/shadow, a clean ring like Stripe Checkout).
- **Cards** — `bg-surface`, 1px border-subtle, 16px radius, 24px padding. Product cards add a 4:5 image slot, hover = border turns to `text-tertiary` (not shadow-pop — a calmer hover than most e-commerce sites).
- **Badges** — pill, 6px radius... actually `full` radius, 12px caption text, used for status (In Stock/teal, Low Stock/warning, Out of Stock/danger, AI Pick/indigo-tint bg).
- **Tables** (seller/admin) — hairline row dividers, monospace for numeric columns, sticky header, row hover = `bg-muted`.
- **Modals** — `bg-elevated`, 16px radius, centered, backdrop = 40% black scrim (no blur on the scrim itself — blur is reserved for the 3 glass surfaces only).
- **Toasts** — bottom-right, slide+fade in 200ms, auto-dismiss 4s, one at a time (stacked queue, not simultaneous stacks).
- **Nav (sidebar)** — 240px fixed width desktop, icon+label, active item = `brand-indigo-tint` background with a 2px indigo left-border accent (Linear's exact pattern).
- **Command palette (⌘K)** — the one global glass surface. Fuzzy search across products/orders/settings, keyboard-first.
- **Avatar / Skeleton loaders** — skeletons use `bg-muted` shimmer at 1.2s ease loop (the one permitted looping animation, since it communicates ongoing loading, not decoration).

---

## 3. Landing Page

```
┌───────────────────────────────────────────────┐
│ Logo        Products  Solutions  Pricing   [Sign in] [Start free] │
├───────────────────────────────────────────────┤
│                                                 │
│   Commerce that gets smarter with every sale   │  ← Display XL, centered,
│   AI-priced, AI-merchandised, human-run.        │    max 640px line width
│                                                 │
│   [ Start selling ]   [ Watch 2-min demo ]      │
│                                                 │
│   ┌── live product-grid demo, real cards ───┐   │  ← interactive, not a
│   │  cards animate price/recommendation      │   │    static screenshot
│   │  ribbons drawing in on scroll            │   │
│   └───────────────────────────────────────┘   │
├───────────────────────────────────────────────┤
│  Logos strip (grayscale, single row)            │
├───────────────────────────────────────────────┤
│  3-up feature blocks: AI Pricing / AI Search /  │
│  AI Fraud detection — each with a small inline  │
│  data visualization, not an icon                │
├───────────────────────────────────────────────┤
│  Metric band (Stripe-style): dark surface,      │
│  3–4 large Geist numbers with mono sub-labels   │
├───────────────────────────────────────────────┤
│  Seller testimonial (single, real quote style)  │
├───────────────────────────────────────────────┤
│  CTA band + Footer (4-column link grid)         │
└───────────────────────────────────────────────┘
```

Hero is the thesis: not a static screenshot but a **live, interactive product grid** where the AI Confidence Ribbon animation is actually demonstrated in the first five seconds — this is the signature element and it's shown, not described. Background stays flat `bg-canvas`; the only color is the indigo ribbon and CTA button, so it draws the eye correctly.

---

## 4. Authentication Pages

Single centered card (440px) on `bg-canvas`, no split-screen marketing panel (avoids the generic "illustration on the left" template).

- **Sign up / Log in** — Email + password, then social auth row (Google/GitHub) below a hairline "or" divider. Password field has a live strength meter using teal→warning→danger, mono-font hint text.
- **Role selection** (post-signup, one-time): two large tappable cards — "I'm shopping" vs "I'm selling" — sets the account into Customer or Seller track. No dropdown; this decision is important enough to be a visual choice.
- **Forgot password / OTP / verify email** — same 440px card shell, single-purpose, one primary action visible at a time.
- **Errors** render inline under the field, danger-red text, no toast for validation errors (toasts are reserved for system-level events).

---

## 5. Customer Dashboard

Layout: 240px sidebar + content area, sidebar sections = *Overview, Orders, Wishlist, Recommendations, Addresses, Payment methods, Settings*.

- **Overview** — greeting header, 3 stat cards (Active orders / Saved items / Reward points), then "Picked for you" horizontal product rail with AI ribbon on each card, then recent order list (compact rows, status badge + mono order ID).
- **Orders** — table on desktop / stacked cards on mobile, each row expandable to a tracking timeline (horizontal stepper: Placed → Packed → Shipped → Delivered, teal fill for completed steps).
- **Recommendations** — full-width grid, filter chips at top ("Based on your orders," "Trending," "Price drops"), each card shows the ribbon plus a one-line mono "why" caption (e.g., `similar to Order #4821`) — transparency about the AI, in the data font, kept small and secondary.

---

## 6. Seller Dashboard

This is the Stripe/Linear-density screen — more information per view than the customer side, monospace-heavy.

- **Overview** — revenue line chart (indigo line, teal fill under curve at 8% opacity, no gridlines except a single baseline — Vercel Analytics look), stat cards for Revenue / Orders / Conversion / AI-suggested price changes pending review.
- **Products** — data table: thumbnail, name, SKU (mono), stock (badge), price (mono, with a small indigo "AI suggests $X" inline chip sellers can accept/dismiss with one click — never auto-applied without consent).
- **Orders** — table with bulk actions (fulfil, refund, export), filters as a left-hand facet panel rather than dropdowns (Linear pattern).
- **AI Insights panel** — a slide-in glass panel (one of the 3 reserved glass surfaces) triggered from a persistent right-edge tab; contains pricing/demand forecasts as small sparklines, never a wall of text.
- **Storefront settings** — visual editor for the seller's public shop page (banner, brand color override, policies).

---

## 7. Admin Dashboard

Highest density, darkest default (admin defaults to dark mode, override available):

- **Overview** — platform-wide KPIs (GMV, active sellers, disputes, AI moderation flags), each stat card mono-numeric.
- **User management** — sellers/customers table with role badges, suspend/verify actions, search + advanced filter facets.
- **Moderation queue** — card-per-flagged-item (product, review, or listing), AI-flagged reason shown as a small reasoning chip, approve/reject as the only two actions per card — deliberately narrow to keep moderation fast.
- **System health** — API latency, queue depth, error rate — small multiples of sparkline charts, Vercel-dashboard style.
- **Audit log** — plain monospace table, timestamp / actor / action / target, exportable.

---

## 8. Product Page

- Left: image gallery (large primary image, thumbnail rail below, pinch-zoom on mobile).
- Right: title (H2 Geist), price (large mono, with strikethrough original + teal savings badge if discounted), AI ribbon under a one-line "Recommended because..." if applicable, variant selectors (color swatches as circles, size as segmented control, not a dropdown), quantity stepper, primary CTA "Add to cart" (full-width on mobile, fixed-width on desktop), secondary ghost "Add to wishlist" (heart icon, outline → filled on click, no bounce).
- Below fold: Description (collapsible), Specs (mono key-value table), Reviews (rating distribution bar chart + list), "Frequently bought together" rail, "Similar items" rail (both AI-ribboned).
- Sticky mobile bottom bar once the user scrolls past the primary CTA: price + "Add to cart," so the action is always reachable.

---

## 9. Cart

Slide-in drawer from the right (desktop) / full-screen sheet (mobile) — not a separate page, to keep the shopping flow uninterrupted.

- Line items: thumbnail, name, variant, mono unit price, quantity stepper, remove (ghost X, appears on hover desktop / always visible mobile).
- Inline stock warnings (warning-amber text) if quantity exceeds availability.
- Promo code field, collapsed by default behind a text-link ("Add promo code") to avoid implying a discount is expected.
- Sticky footer: subtotal (mono, large), estimated tax note, primary CTA "Checkout."
- Empty state: single line icon + "Your cart is empty" + "Browse products" link — no illustration/mascot.

---

## 10. Checkout

Single-page, three-section vertical flow (not a multi-step wizard) with a persistent order summary sidebar — Stripe Checkout's exact mental model:

```
┌───────────────────────┬─────────────┐
│ 1. Contact              │ Order summary │
│ 2. Shipping address     │  (sticky)     │
│ 3. Payment               │  line items   │
│    [Stripe Elements]     │  mono totals  │
│                          │              │
│    [ Pay $XX.XX ]        │              │
└───────────────────────┴─────────────┘
```

- Each section collapses to a summary row once completed (checkmark, teal), so returning users can fly through it.
- Payment section uses Stripe's own hosted fields — no custom card-icon strip of 8 payment logos; only the ones actually supported, small and grayscale.
- Order confirmation: full-page state, single teal check icon (line-style, not a filled cartoon check), order number in mono, "What happens next" 3-step tracker, CTA "View order."

---

## 11. Profile

Tabbed single page: *Personal info, Addresses, Payment methods, Notifications, Security*.

- Personal info: avatar (upload via simple circular dropzone, no crop-tool gimmicks shown up front), name/email fields, save button only enables once a field changes (prevents accidental "success" toasts).
- Security: password change, 2FA toggle (segmented control style, not an iOS-skeuomorphic switch — flat pill toggle matching the rest of the system), active sessions list with device + last-seen (mono timestamp) and a "Sign out" ghost button per row.

---

## 12. Search

- Top: search bar expands on focus into a full overlay (not a dropdown) showing recent searches, trending terms, and instant results grouped by category — same visual language as the ⌘K command palette but scoped to storefront search (reuses the glass treatment).
- Results page: left facet panel (category, price range as a dual-handle slider, rating, brand — checkboxes, not chips, once filter count exceeds ~6), main grid, sort dropdown top-right.
- AI-enhanced results (semantic matches beyond exact keyword) get the ribbon + small mono caption `matched by meaning` so users understand why an item appeared.
- Empty results: "No results for '{query}'" + 2–3 suggested alternate terms — actionable, not apologetic copy.

---

## 13. Wishlist

Simple grid, same product card as elsewhere, with two differences: a filled heart badge top-left, and a "Notify on price drop" toggle per item (flat pill switch). Bulk action bar appears once a user selects multiple items (Add all to cart / Remove). Empty state matches cart's minimal pattern.

---

## 14. Dark Mode

Not an inversion — the light and dark token tables above were tuned independently:

- Dark backgrounds are true near-black (`#0B0B0F`), not dark gray, to keep contrast crisp against product photography.
- Indigo and teal are both brightened ~15–20% in dark mode to hold their perceived saturation against the darker canvas.
- Shadows are replaced by a 1px lighter border (`rgba(255,255,255,0.08)`) for elevation, since dark-on-dark shadows are invisible.
- Product photography gets a 2% white surface pad behind transparent-background images so product cutouts don't float ambiguously on pure black.
- Toggle lives in the top nav (sun/moon line icon, instant switch, no theme-preview animation).

---

## 15. Mobile UI

- Bottom tab bar (Home, Search, Cart, Wishlist, Profile) replaces the sidebar entirely below 768px — icons + labels, active tab = indigo icon + label, others = tertiary gray.
- Product grid: 2-column on phone, 3-column on tablet.
- All drawers (cart, filters, AI insights) become full-height bottom sheets with a drag handle, following the platform's native sheet conventions (rounded top corners only, `lg` radius).
- Checkout keeps the single-column flow with the order summary collapsed into an expandable "Order summary" accordion above the pay button, rather than a persistent sidebar.
- Tap targets minimum 44×44px throughout; sticky CTAs (Add to cart, Checkout) always thumb-reachable at the bottom.

---

## 16. Desktop UI

- 1280px max content width, sidebar navigation for all three logged-in dashboards (Customer/Seller/Admin).
- Hover states are meaningful everywhere (row highlight, card border shift, button darken) since desktop has a pointer — mobile never fakes hover.
- Keyboard support throughout: ⌘K command palette, tab order follows visual order, all modals trap focus and close on Escape.
- Multi-column data tables (seller/admin) only appear at desktop widths — they collapse to card lists below 1024px rather than horizontally scrolling.

---

## 17. Animation & Micro-interaction Summary

| Interaction | Motion |
|---|---|
| Button press | 98% scale, 120ms |
| Card hover | border color shift, 150ms, no lift/shadow-pop |
| AI ribbon reveal | 2px underline draws left→right, 400ms, once per item view |
| Drawer/sheet open | slide + fade, 220ms decelerate |
| Toast | slide+fade in 200ms, hold 4s, fade out 150ms |
| Route/page transition | 12px vertical fade-slide, 300ms |
| Skeleton loading | shimmer sweep, 1.2s ease, loops until content resolves |
| Checkout step complete | checkmark draws (stroke animation), 300ms, teal |

Nothing else animates. No confetti, no bounce easing, no parallax scroll effects — the system's restraint is itself the "premium" signal, matching the Apple/Stripe/Linear/Vercel reference points.

---

## 18. Accessibility Floor

- Contrast: all text meets WCAG AA against its background token pairing in both modes.
- Focus states: visible 2px indigo ring on every interactive element, never `outline: none` without a replacement.
- `prefers-reduced-motion` collapses all transform-based transitions to opacity-only, ≤80ms.
- Color is never the only status signal — badges pair color with a label ("In Stock," not just green).
- All icon-only buttons carry accessible labels; all form fields have visible labels (no placeholder-as-label pattern).

---

## Signature Element Recap

The **AI Confidence Ribbon** — a single-draw indigo underline paired with a small monospace "why" caption — is the one recurring visual signature across recommendations, search, and pricing suggestions. It's what makes the platform's AI feel *shown, specific, and dismissible* rather than a generic "sparkle icon" slapped on cards, which is the cartoon-UI pattern this system is explicitly designed to avoid.