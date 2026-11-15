import { CreditPacks } from "@/components/billing/credit-packs";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { databasePool } from "@/lib/db/pool";
import { isPayuConfigured } from "@/lib/billing/payu";
export const metadata = { title: "Buy Fox Credits | Scripted Fox" };
export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const [user, params] = await Promise.all([requireAuthenticatedUser(), searchParams]);
  const result = await databasePool.query(`SELECT CASE WHEN status = 'trialing' THEN trial_ends_at ELSE current_period_end END AS expires_at FROM billing_accounts
    WHERE user_id = $1 AND plan_code IN ('pro','elite') AND ((status = 'active' AND current_period_end > now()) OR (status = 'trialing' AND trial_ends_at > now()))`, [user.id]);
  const expiresAt = result.rows[0]?.expires_at ? new Date(result.rows[0].expires_at).toISOString() : null;
  const payment = ["success","pending","failed","invalid"].includes(params.payment ?? "") ? params.payment : undefined;
  return <CreditPacks expiresAt={expiresAt} checkoutEnabled={Boolean(expiresAt) && isPayuConfigured()} payment={payment} />;
}
