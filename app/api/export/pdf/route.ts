import { readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { requireAuthenticatedUser, AuthenticationRequiredError } from "@/lib/auth/session";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { createScriptPdf } from "@/lib/export/script-pdf";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";

export const runtime = "nodejs";

const requestSchema = z.object({
  title: z.string().trim().min(1).max(160),
  author: z.string().trim().max(100).optional().default(""),
  sections: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    body: z.string().trim().min(1).max(12_000),
  })).min(1).max(12),
});

type PdfAssets = {
  courierRegular: Uint8Array;
  courierBold: Uint8Array;
  devanagari: Uint8Array;
  typewriterImage: Uint8Array;
};

let assetsPromise: Promise<PdfAssets> | undefined;

function loadPdfAssets() {
  assetsPromise ??= Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/CourierPrime-Regular.ttf")),
    readFile(path.join(process.cwd(), "public/fonts/CourierPrime-Bold.ttf")),
    readFile(path.join(process.cwd(), "public/fonts/NotoSansDevanagari.ttf")),
    readFile(path.join(process.cwd(), "public/typewriter-ascii-wide.png")),
  ]).then(([courierRegular, courierBold, devanagari, typewriterImage]) => ({
    courierRegular,
    courierBold,
    devanagari,
    typewriterImage,
  }));
  return assetsPromise;
}

function safeFilename(title: string) {
  const value = title.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
  return `${value || "scripted-fox-script"}.pdf`;
}

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 160_000) return Response.json({ error: "This script is too large to export." }, { status: 413 });

  try {
    const user = await requireAuthenticatedUser();
    const access = await getBillingAccess(user.id);
    if (!hasBillingFeature(access, "advanced_exports")) {
      return Response.json({ error: "PDF export is not included in your current plan." }, { status: 403 });
    }
    const parsed = requestSchema.safeParse(await readJsonBody(request, 160000));
    if (!parsed.success) return Response.json({ error: "Add a title and script content before exporting." }, { status: 400 });
    const assets = await loadPdfAssets();
    const bytes = await createScriptPdf({ ...parsed.data, ...assets });
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${safeFilename(parsed.data.title)}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    if (error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to export this script." }, { status: 401 });
    console.error("[PDF export] Generation failed", error instanceof Error ? { name: error.name, message: error.message } : { name: "UnknownError" });
    return Response.json({ error: "The PDF could not be generated. Please try again." }, { status: 500 });
  }
}
