# Legacy Supabase Auth migrations

The SQL files in this directory belong to the previous Supabase Auth architecture
and reference `auth.users`, Supabase RLS roles, and Supabase RPC helpers. **Do not
apply them to a Better Auth database.**

The current application uses Supabase only to host PostgreSQL. Better Auth owns
the `user`, `session`, `account`, and `verification` tables. Run the current
migration path from the repository root instead:

```bash
pnpm db:migrate
```

Application migrations live in `db/migrations`. This legacy directory remains
temporarily for migration history and should be removed only after every active
environment has been confirmed to use the Better Auth schema.
