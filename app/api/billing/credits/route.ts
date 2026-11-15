import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { databasePool } from "@/lib/db/pool";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const result = await databasePool.query(`SELECT credits_remaining FROM billing_accounts WHERE user_id = $1
      AND ((status = 'active' AND current_period_end > now()) OR (status = 'trialing' AND trial_ends_at > now()))`, [user.id]);
    return Response.json({ credits: Number(result.rows[0]?.credits_remaining ?? 0) }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof AuthenticationRequiredError ? "Sign in to view credits." : "Credit balance unavailable." },
      { status: error instanceof AuthenticationRequiredError ? 401 : 503, headers });
  }
}
