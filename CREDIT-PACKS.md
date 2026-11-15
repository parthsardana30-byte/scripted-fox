# Credit packs

- Pro/Gold/Basic badge opens `/dashboard/upgrade`; Fox Credits opens `/dashboard/credits`.
- Packs: INR 29 = 50 credits, INR 100 = 170 credits, INR 500 = 1,000 credits.
- Per owner instruction, purchased credits expire with the plan/trial period active when checkout was created. No renewal, plan change or expiry extension is included.
- An active eligible plan/trial is required. Price, credit count, owner and expiry come from the server, not the client. PayU signature and server verification must succeed before crediting.
- Payment-row locking and one transaction cover the balance increment and paid marker. Duplicate callbacks do not grant credits again. Top-ups increase both remaining credits and the current period allowance, preserving the existing refund cap.
- If the period expires/changes during checkout, a captured payment becomes `pending_credit_review` and does not credit the wrong period. Operator must review/refund it using PayU; no automatic refund is claimed. Query these rows operationally before release.

## Release gate

Apply `db/migrations/007_credit_packs.sql` before deploying the updated payment callbacks. Migration is not applied locally to the configured remote database. Production payments are not tested or deployed by this task. Test checkout, signed callbacks, duplicate webhook delivery, expiry/review, and refunds on an isolated database before enabling purchases.

Preview: `/ui-preview?view=credits` and `/ui-preview?view=plans`. Pack selection works, but previews never create a PayU payment.
