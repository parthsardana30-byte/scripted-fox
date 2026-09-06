import { processPayuResponse } from "@/lib/billing/payu-payment";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const payload = Object.fromEntries(
      [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
    const result = await processPayuResponse(payload);
    if (result.status === "invalid") return Response.json({ accepted: false }, { status: 400 });
    if (result.status === "pending") return Response.json({ accepted: false }, { status: 503 });
    return Response.json({ accepted: true });
  } catch {
    return Response.json({ accepted: false }, { status: 500 });
  }
}
