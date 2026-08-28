import { ideaSchema } from "@/lib/landing-schema";

export const LANDING_INTENT_COOKIE = "next-video-landing-intent";
export const LANDING_INTENT_MAX_AGE_SECONDS = 30 * 60;

export function encodeLandingIntent(idea: string) {
  const parsed = ideaSchema.parse({ idea });
  return Buffer.from(parsed.idea, "utf8").toString("base64url");
}

export function decodeLandingIntent(value: string | undefined) {
  if (!value) return "";

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(value, "base64url"));
    const parsed = ideaSchema.safeParse({ idea: decoded });
    return parsed.success ? parsed.data.idea : "";
  } catch {
    return "";
  }
}
