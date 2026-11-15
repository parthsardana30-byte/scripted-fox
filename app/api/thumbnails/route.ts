import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";
import { thumbnailRequestSchema } from "@/lib/thumbnails/types";
import { decodeImage, generateThumbnail, thumbnailConfigured, ThumbnailError } from "@/lib/thumbnails/provider";
import { completeThumbnail, failThumbnail, reserveThumbnail, thumbnailStatus } from "@/lib/thumbnails/repository";
import { canUseThumbnailStudio } from "@/lib/thumbnails/access";

export const runtime = "nodejs";
export const maxDuration = 120;
const headers = { "Cache-Control": "private, no-store" };

function failure(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to create thumbnails." }, { status: 401, headers });
  if (error instanceof ThumbnailError || error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status, headers });
  return Response.json({ error: "Thumbnail service is temporarily unavailable. Refresh to check your balance and recent images before retrying." }, { status: 503, headers });
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    if (!await canUseThumbnailStudio(user.id)) return Response.json({ error: "Thumbnail Studio is available with an active Gold plan. Upgrade to Gold to continue.", upgradeUrl: "/dashboard/upgrade?plan=elite" }, { status: 403, headers });
    return Response.json(await thumbnailStatus(user.id), { headers });
  }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers });
  try {
    const user = await requireAuthenticatedUser();
    if (!await canUseThumbnailStudio(user.id)) return Response.json({ error: "Thumbnail Studio is available with an active Gold plan. Upgrade to Gold to continue.", upgradeUrl: "/dashboard/upgrade?plan=elite" }, { status: 403, headers });
    const parsed = thumbnailRequestSchema.safeParse(await readJsonBody(request, 9 * 1024 * 1024));
    if (!parsed.success) throw new ThumbnailError("Add a topic and up to 3 JPG, PNG or WebP photos (2 MB each).", 400);
    const input = parsed.data;
    for (const photo of input.photos) decodeImage(photo.data, photo.mimeType);
    if (!thumbnailConfigured()) throw new ThumbnailError("Thumbnail generation is not configured yet. No credits were used.");
    const reservation = await reserveThumbnail(user.id, input);
    if (!reservation.fresh) {
      if (reservation.status === "failed") throw new ThumbnailError("This attempt failed; your allowance was restored. Start a new generation.", 422);
      return Response.json({ id: input.requestId, status: reservation.status, cost: reservation.cost }, { status: reservation.status === "pending" ? 202 : 200, headers });
    }
    try {
      const image = await generateThumbnail(input);
      await completeThumbnail(user.id, input.requestId, image);
    } catch (error) {
      await failThumbnail(user.id, input.requestId);
      throw error;
    }
    return Response.json({ id: input.requestId, status: "succeeded", cost: reservation.cost }, { headers });
  } catch (error) { return failure(error); }
}
