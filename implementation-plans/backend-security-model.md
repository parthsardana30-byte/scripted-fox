# Backend Trust and Security Model

## Scope

This document locks Backend Phase B0 for the Next Video application. It applies to Supabase Postgres and Auth, Next.js Route Handlers and Server Actions, YouTube OAuth, scheduled synchronization, exports, and the future AI gateway.

## Trust boundaries

1. **Browser:** untrusted. It receives only the Supabase project URL and publishable key. UI checks are usability features, not authorization.
2. **Next.js server:** trusted application boundary. It validates input, re-checks the authenticated user, enforces resource ownership, and reads server-only credentials.
3. **Supabase Data API:** protected by Postgres grants and Row Level Security. Every exposed user table defaults to deny and scopes rows with `auth.uid()`.
4. **Privileged server client:** exceptional boundary for migrations, synchronization, and jobs. It uses the Supabase secret key, bypasses RLS, and must never be imported by Client Components.
5. **External providers:** untrusted responses. Google, YouTube, and future AI responses are validated before persistence or rendering.

## Secret ownership

| Secret | Owner | Browser exposure | Storage |
|---|---|---:|---|
| Supabase publishable key | Supabase project | Allowed | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Supabase secret key | Backend only | Never | deployment secret / `.env.local` in development |
| Postgres connection string | migrations and trusted jobs | Never | deployment secret / `.env.local` in development |
| Google client secret | YouTube OAuth server routes | Never | deployment secret |
| YouTube refresh token | connected user, handled by server | Never | encrypted value in restricted `private.youtube_credentials` |
| AI provider key | AI gateway only | Never | deployment secret |

## Authorization rules

- Dashboard route protection is an optimistic redirect only; every data operation independently authenticates the user.
- Server code uses `auth.getUser()` for a verified user identity.
- Every mutation validates attacker-controlled input with Zod.
- Every resource query includes ownership constraints; RLS provides a second enforcement layer.
- Shared trend snapshots contain public-source aggregates only and are readable only by authenticated users.
- OAuth credentials are never returned in Data API responses, logs, HTML, analytics, or error messages.

## Data and cache rules

- User-specific responses are private and uncached unless a user-scoped cache is deliberately designed.
- Channel snapshots and creator profiles are persistent database records, not temporary files.
- Shared trend cache keys include market, language, niche, source, and time window.
- Stale snapshots may be used while a refresh is retried; their capture time is always retained.

## Environment separation

- Development, test, preview, and production use different Supabase projects and provider credentials.
- `.env.local` is ignored and contains local secrets only.
- `.env.example` contains variable names and safe defaults only.
- Production secrets are configured in the hosting provider, never committed.

## Deferred B0 controls

- YouTube token encryption is implemented with the OAuth lifecycle in B3.
- Rate limits and idempotency storage are added with the first mutation and AI endpoints.
- Job authentication and scheduler configuration are chosen after the hosting provider is selected.
- Production CSP and monitoring are finalized during B10 after external integrations are known.
