import { publicEnvironmentSchema } from "@/lib/env/schema";

export const publicEnvironment = publicEnvironmentSchema.parse({
  NEXT_PUBLIC_DEPLOYMENT_ENV: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV ??
    (process.env.NODE_ENV === "production" ? "production" : "development"),
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
});
