# Billing and subscriptions implementation plan

## Current decision

The application remains billing-provider neutral. No Stripe or Razorpay package, secret, checkout session, webhook, price ID, or numeric price is added until a provider and commercial plan are approved.

## Phase 1 — UI and routing

### 1.1 Public pricing

- Route: `/pricing`
- Linked from the landing-page header and footer.
- Shows Free, Creator, Pro, and Business access levels.
- Paid prices remain “Price to be set”; paid buttons never collect payment.

### 1.2 Signed-in upgrade page

- Route: `/dashboard/upgrade`
- Kept out of the sidebar to avoid navigation clutter.
- Reached from Account → Plan and billing or from a premium feature.
- Optional validated query parameters:
  - `feature`: explains which premium feature was attempted.
  - `plan`: remembers the selected paid plan.

### 1.3 Authentication handoff

- A signed-out visitor selecting a paid plan goes through `/sign-up` with an internal `next` path.
- Existing safe redirect validation prevents an external redirect from being supplied.
- After authentication, the user can return to the upgrade route.

### 1.4 Premium feature behavior

- Free features remain usable without interruption.
- PDF and Word export are the first premium entry points.
- A free user selecting either is taken to `/dashboard/upgrade?feature=advanced_exports`.
- Premium access is checked by the server before the editor receives its entitlement. Browser state is not authoritative.

## Phase 2 — Provider-neutral security architecture

### 2.1 Billing account

- `billing_accounts` stores the effective plan, billing status, optional trial dates, and optional future provider references.
- Every account starts on Free.
- Existing users are backfilled; new users receive a Free billing row from the auth trigger.

### 2.2 Database access

- Row-level security permits a signed-in user to read only their own billing row.
- There are no client insert, update, or delete policies.
- Future verified webhooks will update subscriptions through server-only service credentials.

### 2.3 Webhook event safety

- `private.billing_events` is reserved for verified, idempotent provider events.
- Provider event IDs are unique to prevent replayed events from being applied twice.
- The private table is inaccessible to browser roles.

### 2.4 Server access API

- `GET /api/billing/access` returns only the signed-in user’s effective plan and feature flags.
- Responses are private and not cached.
- Missing or expired access falls back to Free.

## Phase 3 — Deferred until provider selection

1. Select Stripe or Razorpay.
2. Approve actual prices, currency, billing period, trial length, refund rules, and tax handling.
3. Add provider-specific checkout and customer-portal adapters.
4. Add a webhook endpoint with signature verification against the raw request body.
5. Map provider price IDs to server-owned plan codes; never accept a plan or amount from the browser.
6. Activate trial and paid CTAs only after end-to-end webhook tests pass.

## Where pricing appears

- Public landing header and footer.
- Dedicated public pricing page.
- Account → Plan and billing.
- The dedicated upgrade page after a premium-feature attempt.
- It does not appear as a permanent sidebar page.
