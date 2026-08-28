import "server-only";

import { serverEnvironment } from "@/lib/env/server";

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
] as const;

export function requireYouTubeEnvironment() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_YOUTUBE_REDIRECT_URI,
    YOUTUBE_TOKEN_ENCRYPTION_KEY,
  } = serverEnvironment;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_YOUTUBE_REDIRECT_URI || !YOUTUBE_TOKEN_ENCRYPTION_KEY) {
    throw new Error("YouTube OAuth is not configured for this environment.");
  }

  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_YOUTUBE_REDIRECT_URI,
    tokenEncryptionKey: YOUTUBE_TOKEN_ENCRYPTION_KEY,
  };
}
