import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { databasePool } from "@/lib/db/pool";
import { publicEnvironment } from "@/lib/env/public";
import { serverEnvironment } from "@/lib/env/server";

const google = serverEnvironment.GOOGLE_AUTH_CLIENT_ID && serverEnvironment.GOOGLE_AUTH_CLIENT_SECRET
  ? {
      google: {
        clientId: serverEnvironment.GOOGLE_AUTH_CLIENT_ID,
        clientSecret: serverEnvironment.GOOGLE_AUTH_CLIENT_SECRET,
      },
    }
  : undefined;

export const auth = betterAuth({
  appName: "Scripted Fox",
  baseURL: publicEnvironment.NEXT_PUBLIC_SITE_URL,
  secret: serverEnvironment.BETTER_AUTH_SECRET,
  database: databasePool,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 72,
  },
  socialProviders: google,
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await databasePool.query(
            `INSERT INTO profiles (id, display_name, avatar_url) VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, avatar_url = EXCLUDED.avatar_url`,
            [user.id, user.name, user.image],
          );
          await databasePool.query(
            "INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
            [user.id],
          );
          await databasePool.query(
            `INSERT INTO billing_accounts (user_id, plan_code, status, trial_ends_at)
             VALUES ($1, 'pro', 'trialing', now() + interval '7 days')
             ON CONFLICT (user_id) DO NOTHING`,
            [user.id],
          );
        },
      },
    },
  },
  plugins: [nextCookies()],
  telemetry: { enabled: false },
});
