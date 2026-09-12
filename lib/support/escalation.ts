import type { EmailEscalation } from "@/lib/support/email-links";
import { redactSensitiveSupportText } from "@/lib/support/knowledge";

export function buildSupportEscalation(input: { email: string; accountEmail?: string; category: string; page: string; description: string }): EmailEscalation {
  const category = input.category.replace(/[^a-z]/gi, "").slice(0, 24) || "support";
  return {
    type: "email_support",
    email: input.email,
    subject: `Scripted Fox ${category} support request`,
    body: [
      "Hello Scripted Fox Support,",
      "",
      `Account email: ${input.accountEmail ?? "Not signed in"}`,
      `Issue category: ${category}`,
      `Page: ${redactSensitiveSupportText(input.page)}`,
      "",
      "Description:",
      redactSensitiveSupportText(input.description),
      "",
      "Thank you.",
    ].join("\n"),
  };
}
