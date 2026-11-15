import "server-only";
import { serverEnvironment } from "@/lib/env/server";
import { PHOTO_LIMIT, type ThumbnailInput } from "./types";

export class ThumbnailError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}

export function thumbnailConfigured() {
  return Boolean(serverEnvironment.THUMBNAIL_API_KEY || serverEnvironment.GEMINI_API_KEY);
}

export function decodeImage(data: string, mime: string, maximum = PHOTO_LIMIT) {
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length || bytes.length > maximum || bytes.toString("base64") !== data) {
    throw new ThumbnailError("Invalid or oversized image. Use JPG, PNG or WebP up to 2 MB per photo.", 400);
  }
  const valid = mime === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : mime === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : mime === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw new ThumbnailError("The photo format does not match its contents.", 400);
  return bytes;
}

export async function generateThumbnail(input: ThumbnailInput) {
  const key = serverEnvironment.THUMBNAIL_API_KEY || serverEnvironment.GEMINI_API_KEY;
  if (!key) throw new ThumbnailError("Thumbnail generation is not configured yet. No credits were used.");
  const model = serverEnvironment.THUMBNAIL_MODEL || "gemini-2.5-flash-image";
  const prompt = `Create one finished landscape 16:9 YouTube thumbnail. Art direction: ${input.style}. Strong composition, clear focal subject, high contrast, legible at small sizes. Create the background, lighting and layout yourself. Use any attached photos as reference subjects, preserving their identity and key appearance. Do not add a watermark or fake platform UI. ${input.headline ? `Use this exact short headline: ${JSON.stringify(input.headline)}.` : "Do not add text."} Video topic / creative brief: ${input.topic}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, ...input.photos.map(photo => ({ inlineData: photo }))] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "16:9" } },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (response.status === 429) throw new ThumbnailError("The image service has reached its usage limit. Please try again later. Your thumbnail allowance will be restored.");
  if (!response.ok) throw new ThumbnailError("The image service is unavailable. Please try again later.");
  // Bound even an unexpectedly large upstream response.
  const reader = response.body?.getReader();
  if (!reader) throw new ThumbnailError("The image service returned no image.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 12 * 1024 * 1024) { await reader.cancel(); throw new ThumbnailError("Generated image is too large. Please try again."); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const result = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }> };
  const image = result.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData;
  if (!image?.data || !image.mimeType) throw new ThumbnailError("No image was generated. Try a different brief or photo.", 422);
  return { bytes: decodeImage(image.data, image.mimeType, 8 * 1024 * 1024), mime: image.mimeType };
}
