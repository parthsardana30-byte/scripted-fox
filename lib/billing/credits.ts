import "server-only";

import { databasePool } from "@/lib/db/pool";

function validateCreditAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new RangeError("Credit amount must be a positive safe integer.");
}

export async function consumeCredits(userId: string, amount: number) {
  validateCreditAmount(amount);
  const result = await databasePool.query(
    `UPDATE billing_accounts
     SET credits_remaining = credits_remaining - $2, updated_at = now()
     WHERE user_id = $1 AND credits_remaining >= $2
     RETURNING credits_remaining`,
    [userId, amount],
  );
  return result.rowCount === 1;
}

export async function refundCredits(userId: string, amount: number) {
  validateCreditAmount(amount);
  await databasePool.query(
    `UPDATE billing_accounts
     SET credits_remaining = LEAST(credits_allowance, credits_remaining + $2), updated_at = now()
     WHERE user_id = $1`,
    [userId, amount],
  );
}
