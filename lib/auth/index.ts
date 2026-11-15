import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

import { databasePool } from "@/lib/db/pool";
import { publicEnvironment } from "@/lib/env/public";
import { serverEnvironment } from "@/lib/env/server";
import { revokeConnectedYouTubeAccess } from "@/lib/auth/delete-account";
import { isVerificationEmailConfigured, sendAccountDeletionEmail, sendPasswordResetEmail, sendVerificationCodeEmail } from "@/lib/email/verification-email";
import { googleSignInCallbackUrl, googleSignInCredentials } from "@/lib/auth/google-config";

const google = googleSignInCredentials
  ? {
      google: {
        clientId: googleSignInCredentials.clientId,
        clientSecret: googleSignInCredentials.clientSecret,
        redirectURI: googleSignInCallbackUrl,
      },
    }
  : undefined;

export const auth = betterAuth({
  appName: "Scripted Fox",
  baseURL: publicEnvironment.NEXT_PUBLIC_SITE_URL,
  trustedOrigins: [new URL(publicEnvironment.NEXT_PUBLIC_SITE_URL).origin],
  secret: serverEnvironment.BETTER_AUTH_SECRET,
  database: databasePool,
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 72,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  verification: {
    storeIdentifier: "hashed",
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      allowDifferentEmails: false,
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => revokeConnectedYouTubeAccess(user.id),
      ...(isVerificationEmailConfigured()
        ? {
            sendDeleteAccountVerification: async ({ user, url }: { user: { email: string }; url: string }) => {
              await sendAccountDeletionEmail(user.email, url);
            },
          }
        : {}),
    },
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
            `INSERT INTO billing_accounts (user_id, plan_code, status, trial_ends_at, credits_allowance, credits_remaining)
             VALUES ($1, 'pro', 'trialing', now() + interval '7 days', 500, 500)
             ON CONFLICT (user_id) DO NOTHING`,
            [user.id],
          );
        },
      },
    },
  },
  plugins: [
    emailOTP({
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 10 * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      rateLimit: { window: 60, max: 3 },
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "email-verification") return;
        await sendVerificationCodeEmail(email, otp);
      },
    }),
    nextCookies(),
  ],
  telemetry: { enabled: false },
});
