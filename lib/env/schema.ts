import { z } from "zod";

const deploymentEnvironmentSchema = z.enum(["development", "production"]);
const optionalString = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());
const optionalUrl = z.preprocess((value) => value === "" ? undefined : value, z.url().optional());
const optionalEncryptionKey = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().regex(/^[A-Za-z0-9+/]{43}=$/).optional(),
);

function isLocalUrl(value: string) {
  const hostname = new URL(value).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export const publicEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_DEPLOYMENT_ENV: deploymentEnvironmentSchema,
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_SITE_URL: z.url(),
  })
  .superRefine((environment, context) => {
    if (environment.NEXT_PUBLIC_DEPLOYMENT_ENV !== "production") return;

    if (isLocalUrl(environment.NEXT_PUBLIC_SITE_URL)) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SITE_URL"],
        message: "Production cannot use a localhost site URL.",
      });
    }

    if (!environment.NEXT_PUBLIC_SITE_URL.startsWith("https://")) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SITE_URL"],
        message: "Production site URLs must use HTTPS.",
      });
    }
  });

export const serverEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_DEPLOYMENT_ENV: deploymentEnvironmentSchema,
    SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
    SUPABASE_DB_URL: z.string().min(1),
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    GOOGLE_YOUTUBE_REDIRECT_URI: optionalUrl,
    YOUTUBE_TOKEN_ENCRYPTION_KEY: optionalEncryptionKey,
    YOUTUBE_DATA_API_KEY: optionalString,
    AI_PROVIDER: optionalString,
    AI_API_KEY: optionalString,
    AI_MODEL: optionalString,
    BILLING_PROVIDER: z.enum(["payu"]).optional(),
    PAYU_ENVIRONMENT: z.enum(["test", "production"]).optional(),
    PAYU_MERCHANT_KEY: optionalString,
    PAYU_MERCHANT_SALT: optionalString,
  })
  .superRefine((environment, context) => {
    if (environment.NEXT_PUBLIC_DEPLOYMENT_ENV !== "production") return;

    if (environment.GOOGLE_YOUTUBE_REDIRECT_URI && isLocalUrl(environment.GOOGLE_YOUTUBE_REDIRECT_URI)) {
      context.addIssue({
        code: "custom",
        path: ["GOOGLE_YOUTUBE_REDIRECT_URI"],
        message: "Production cannot use a localhost YouTube callback.",
      });
    }
  });

export type DeploymentEnvironment = z.infer<typeof deploymentEnvironmentSchema>;
