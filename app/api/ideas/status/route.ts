import { z } from "zod";

import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/client";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";

export const runtime = "nodejs";

const requestSchema = z.object({
  id: z.uuid(),
  status: z.enum(["recommended", "saved", "dismissed", "used"]),
});

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  try {
    const user = await requireAuthenticatedUser();
    const parsed = requestSchema.safeParse(await readJsonBody(request, 2000));
    if (!parsed.success) return Response.json({ error: "The idea update is invalid." }, { status: 400 });
    const { error, count } = await createClient().from("ideas").update({
      status: parsed.data.status,
      dismissed_at: parsed.data.status === "dismissed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", parsed.data.id).eq("user_id", user.id);
    if (error) return Response.json({ error: "The idea could not be updated." }, { status: 500 });
    if ((count ?? 0) === 0) return Response.json({ error: "The idea was not found." }, { status: 404 });
    return Response.json({ status: parsed.data.status });
  } catch (error) {
    if (error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to update ideas." }, { status: 401 });
    return Response.json({ error: "The idea could not be updated." }, { status: 500 });
  }
}
