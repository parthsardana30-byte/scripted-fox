import "server-only";

import { serverEnvironmentSchema } from "@/lib/env/schema";

export const serverEnvironment = serverEnvironmentSchema.parse({
  NEXT_PUBLIC_DEPLOYMENT_ENV: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV ??
    (process.env.NODE_ENV === "production" ? "production" : "development"),
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  GOOGLE_AUTH_CLIENT_ID: process.env.GOOGLE_AUTH_CLIENT_ID,
  GOOGLE_AUTH_CLIENT_SECRET: process.env.GOOGLE_AUTH_CLIENT_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_YOUTUBE_REDIRECT_URI: process.env.GOOGLE_YOUTUBE_REDIRECT_URI,
  YOUTUBE_TOKEN_ENCRYPTION_KEY: process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY,
  YOUTUBE_DATA_API_KEY: process.env.YOUTUBE_DATA_API_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  AI_PROVIDER: process.env.AI_PROVIDER,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  XAI_API_KEY: process.env.XAI_API_KEY,
  XAI_MODEL: process.env.XAI_MODEL,
  GROK_API_KEY: process.env.GROK_API_KEY,
  GROK_MODEL: process.env.GROK_MODEL,
  FOX_AI_API_URL: process.env.FOX_AI_API_URL,
  FOX_AI_API_KEY: process.env.FOX_AI_API_KEY,
  FOX_AI_MODEL: process.env.FOX_AI_MODEL,
  FOX_AI_SUPPORT_EMAIL: process.env.FOX_AI_SUPPORT_EMAIL,
  BILLING_TEST_USER_IDS: process.env.BILLING_TEST_USER_IDS,
  BILLING_PROVIDER: process.env.BILLING_PROVIDER,
  PAYU_MERCHANT_KEY: process.env.PAYU_MERCHANT_KEY,
  PAYU_MERCHANT_SALT: process.env.PAYU_MERCHANT_SALT,
});
