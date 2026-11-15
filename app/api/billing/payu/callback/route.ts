import { publicEnvironment } from "@/lib/env/public";
import { processPayuResponse, type PayuProcessingResult } from "@/lib/billing/payu-payment";

function redirectFor(result: PayuProcessingResult) {
  const destination = new URL(result.creditPack ? "/dashboard/credits" : "/dashboard/upgrade", publicEnvironment.NEXT_PUBLIC_SITE_URL);
  destination.searchParams.set("payment", result.status);
  if (result.plan) destination.searchParams.set("plan", result.plan);
  return Response.redirect(destination, 303);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const payload = Object.fromEntries(
      [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
    return redirectFor(await processPayuResponse(payload));
  } catch {
    return redirectFor({ status: "pending" });
  }
}
