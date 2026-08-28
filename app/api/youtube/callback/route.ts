import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth/session";
import { exchangeYouTubeAuthorizationCode, getConnectedYouTubeChannel } from "@/lib/youtube/google";
import { saveYouTubeConnection } from "@/lib/youtube/repository";

export const runtime = "nodejs";

const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

const stateCookieSchema = z.object({
  state: z.string().min(1),
  userId: z.uuid(),
});

function equalState(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function finish(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  const expiredCookie = {
    httpOnly: true,
    maxAge: 0,
    path: "/api/youtube/callback",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  response.cookies.set("youtube_oauth_state", "", expiredCookie);
  response.cookies.set("youtube_oauth_verifier", "", expiredCookie);
  return response;
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("error") === "access_denied") {
    return finish(request, "/connect?status=cancelled");
  }

  const user = await getAuthenticatedUser();
  if (!user) return finish(request, "/sign-in?next=/connect");

  const callback = callbackSchema.safeParse({
    code: request.nextUrl.searchParams.get("code"),
    state: request.nextUrl.searchParams.get("state"),
  });
  const rawStateCookie = request.cookies.get("youtube_oauth_state")?.value;
  const codeVerifier = request.cookies.get("youtube_oauth_verifier")?.value;

  let stateCookie: z.infer<typeof stateCookieSchema> | null = null;
  try {
    stateCookie = stateCookieSchema.parse(JSON.parse(rawStateCookie ?? "null"));
  } catch {
    stateCookie = null;
  }

  if (
    !callback.success
    || !stateCookie
    || !codeVerifier
    || stateCookie.userId !== user.id
    || !equalState(callback.data.state, stateCookie.state)
  ) {
    return finish(request, "/connect?error=invalid_state");
  }

  try {
    const tokens = await exchangeYouTubeAuthorizationCode(callback.data.code, codeVerifier);
    const channel = await getConnectedYouTubeChannel(tokens.access_token);
    await saveYouTubeConnection(user.id, channel, tokens);
    revalidatePath("/dashboard");
    return finish(request, "/connect?status=connected");
  } catch (error) {
    console.error("YouTube connection failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown failure",
    });
    const noChannel = error instanceof Error && error.message.includes("does not have an accessible YouTube channel");
    return finish(request, noChannel ? "/connect?error=no_channel" : "/connect?error=connection_failed");
  }
}
