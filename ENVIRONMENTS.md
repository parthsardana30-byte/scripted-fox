# Development and production environments

The application uses the same code in every environment. Credentials and callback URLs are selected entirely through environment variables.

## Development

- Local file: `.env.development.local` (ignored by Git)
- App URL: `http://localhost:3000`
- Supabase: development project
- Google sign-in: personal development OAuth client configured in the development Supabase project
- Connect YouTube: personal development OAuth client stored in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

Start with `pnpm dev`. Next.js loads `.env.development.local` automatically.

## Production

- Configure variables in the hosting platform; do not commit production secrets
- App URL: the final HTTPS domain
- Supabase: separate production project owned by the company
- Google sign-in: company-owned OAuth client configured in the production Supabase project
- Connect YouTube: separate company-owned OAuth client stored in the production hosting environment

Use `.env.production.example` as the production checklist. Production validation rejects localhost site and YouTube callback URLs.

## Google credential ownership

Google account sign-in and Connect YouTube use separate Web OAuth clients. They can live in the same Google Cloud project, but they have different redirect URIs and are used by different parts of the system.

When the company account is ready, create a company-owned Google Cloud project and production OAuth clients. Do not overwrite the development clients. Replace only the production Supabase provider settings and production hosting variables.

## Promotion checklist

1. Create the production Supabase project and apply the migrations.
2. Create the company-owned Google sign-in OAuth client and enable it in production Supabase Auth.
3. Create the company-owned Connect YouTube OAuth client with the production callback URL.
4. Configure the production variables from `.env.production.example` in the hosting platform.
5. Add the production application callback to Supabase Auth redirect URLs.
6. Deploy and test sign-in before enabling YouTube connection.

## PayU billing

The pricing UI uses three product levels: Free Trial, Pro, and Elite. Prices,
trial duration, and premium limits remain intentionally unset until the product
decision is made.

For the simplest implementation, use PayU Hosted Checkout with PayU Zion
subscription automation. Keep the merchant key and salt in server-only
environment variables; never expose them through a `NEXT_PUBLIC_` variable.

Development uses PayU Test Mode:

- `BILLING_PROVIDER=payu`
- `PAYU_ENVIRONMENT=test`
- `PAYU_MERCHANT_KEY` from the PayU test dashboard
- `PAYU_MERCHANT_SALT` from the PayU test dashboard

Production uses a separate production key and salt with
`PAYU_ENVIRONMENT=production`. Checkout must remain disabled until the server
can generate the payment hash, validate PayU's reverse hash, compare the amount
and transaction ID with the stored order, verify the transaction server-to-server,
and process callbacks idempotently before changing `billing_accounts`.
