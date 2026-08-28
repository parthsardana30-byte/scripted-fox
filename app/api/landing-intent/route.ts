import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  encodeLandingIntent,
  LANDING_INTENT_COOKIE,
  LANDING_INTENT_MAX_AGE_SECONDS,
} from "@/lib/landing-intent";
import { ideaSchema } from "@/lib/landing-schema";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = ideaSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Describe your video idea first." },
      { status: 400 },
    );
  }

  const user = await getAuthenticatedUser();
  const destination = user
    ? "/dashboard/editor"
    : "/sign-up?next=%2Fdashboard%2Feditor";
  const response = NextResponse.json({ destination });

  response.cookies.set({
    name: LANDING_INTENT_COOKIE,
    value: encodeLandingIntent(parsed.data.idea),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LANDING_INTENT_MAX_AGE_SECONDS,
  });

  return response;
}

export async function DELETE() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set({
    name: LANDING_INTENT_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
