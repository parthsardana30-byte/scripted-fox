# Development and production environments

The application uses the same code in every environment. Credentials and callback URLs are selected entirely through environment variables.

## Development

- Local file: `.env.development.local` (ignored by Git)
- App URL: `http://localhost:3000`
- Database: development Supabase project used only as hosted PostgreSQL
- Authentication: Better Auth in the Next.js server
- Google sign-in: development Google OAuth client configured with the Better Auth callback
- Email verification: Resend API key and a verified development sender
- Connect YouTube: personal development OAuth client stored in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

Start with `pnpm dev`. Next.js loads `.env.development.local` automatically.

## Production

- Configure variables in the hosting platform; do not commit production secrets
- App URL: the final HTTPS domain
- Database: separate production Supabase project used only as hosted PostgreSQL
- Authentication: Better Auth with a distinct production secret
- Google sign-in: company-owned OAuth client configured with the production Better Auth callback
- Email verification: production Resend API key and a sender on the verified company domain
- Connect YouTube: separate company-owned OAuth client stored in the production hosting environment

Use `.env.production.example` as the production checklist. Production validation rejects localhost site and YouTube callback URLs.

## Google credential ownership

Google account sign-in and Connect YouTube use separate Web OAuth clients. They can live in the same Google Cloud project, but they have different redirect URIs and are used by different parts of the system. For local Google sign-in, authorize `http://localhost:3000/api/auth/callback/google`.

When the company account is ready, create a company-owned Google Cloud project and production OAuth clients. Do not overwrite the development clients. Change only the production database, Better Auth, OAuth, and hosting environment variables.

## Promotion checklist

1. Create the production Supabase project, obtain its PostgreSQL Session pooler URL, and set it as `DATABASE_URL`.
2. Set a unique production `BETTER_AUTH_SECRET` and run `pnpm db:migrate` from a trusted deployment environment.
3. Create the company-owned Google sign-in OAuth client and authorize `https://YOUR_DOMAIN/api/auth/callback/google`.
4. Create the company-owned Connect YouTube OAuth client with the production callback URL.
5. Configure the production variables from `.env.production.example` in the hosting platform.
6. Deploy and test email and Google sign-in before enabling YouTube connection.

For a public launch, set the OAuth audience to **External / In production**.
Add `scriptedfox.com` as an authorised domain, keep the homepage, privacy policy,
and terms URLs on the consent screen, and request Google verification for the
exact YouTube scopes used by the app: `youtube.readonly` and
`yt-analytics.readonly`. Publishing alone makes basic Google Sign-In available;
the YouTube consent warning remains until Google approves those scopes.

## Email verification codes

Email/password accounts require a six-digit code before Better Auth creates a
session. Create a Resend API key, verify the sending domain, and configure the
following server-only variables:

- `RESEND_API_KEY`
- `AUTH_EMAIL_FROM`, for example `Scripted Fox <verify@example.com>`

Codes expire after 10 minutes, allow five verification attempts, and are stored
as hashes. Google OAuth signup continues to rely on Google's verified identity
and does not use this additional email-code step.

## PayU billing

The pricing UI uses three product levels: Free Trial, Pro, and Elite. Prices,
trial duration, and premium limits remain intentionally unset until the product
decision is made.

For the simplest implementation, use PayU Hosted Checkout with PayU Zion
subscription automation. Keep the merchant key and salt in server-only
environment variables; never expose them through a `NEXT_PUBLIC_` variable.

Billing uses PayU production Hosted Checkout only:

- `BILLING_PROVIDER=payu`
- `PAYU_MERCHANT_KEY` from the PayU live dashboard
- `PAYU_MERCHANT_SALT` from the PayU live dashboard

Checkout must remain disabled until the server
can generate the payment hash, validate PayU's reverse hash, compare the amount
and transaction ID with the stored order, verify the transaction server-to-server,
and process callbacks idempotently before changing `billing_accounts`.

## Daily trend scan

Set `YOUTUBE_DATA_API_KEY` and a random `CRON_SECRET` of at least 32 characters.
Configure the hosting platform's scheduler to call `GET /api/cron/trends` once
per day with `Authorization: Bearer <CRON_SECRET>`. The scan groups users with
the same niche, markets, and languages so one YouTube scan can serve many
creators. It also stops before an estimated 9,000 YouTube quota units; niches
outside that run still refresh on demand when their creators open Trending Hub.
