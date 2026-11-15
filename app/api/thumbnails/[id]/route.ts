import { z } from "zod";
import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { thumbnailImage } from "@/lib/thumbnails/repository";
import { canUseThumbnailStudio } from "@/lib/thumbnails/access";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  try {
    const user = await requireAuthenticatedUser();
    if (!await canUseThumbnailStudio(user.id)) return new Response(null, { status: 403, headers });
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404, headers });
    const image = await thumbnailImage(user.id, id);
    if (!image) return new Response(null, { status: 404, headers });
    return new Response(new Uint8Array(image.image), { headers: { ...headers, "Content-Type": image.mime_type } });
  } catch (error) {
    return new Response(null, { status: error instanceof AuthenticationRequiredError ? 401 : 503, headers });
  }
}
