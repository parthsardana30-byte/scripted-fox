import "server-only";

import { databasePool } from "@/lib/db/pool";
import { serverEnvironment } from "@/lib/env/server";
import { decryptRefreshToken } from "@/lib/youtube/crypto";

export async function revokeConnectedYouTubeAccess(userId: string) {
  try {
    if (!serverEnvironment.YOUTUBE_TOKEN_ENCRYPTION_KEY) return;
    const result = await databasePool.query<{ ciphertext_base64: string }>(
      `SELECT credentials.ciphertext_base64
       FROM youtube_credentials credentials
       INNER JOIN youtube_connections connection ON connection.id = credentials.connection_id
       WHERE connection.user_id = $1
       LIMIT 1`,
      [userId],
    );
    const encryptedToken = result.rows[0]?.ciphertext_base64;
    if (!encryptedToken) return;

    const refreshToken = decryptRefreshToken(encryptedToken, serverEnvironment.YOUTUBE_TOKEN_ENCRYPTION_KEY);
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("YouTube grant revocation failed during account deletion", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
