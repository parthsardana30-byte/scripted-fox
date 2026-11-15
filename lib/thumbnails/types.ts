import { z } from "zod";

export const THUMBNAIL_CREDITS = 10;
export const PHOTO_LIMIT = 2 * 1024 * 1024;
export const thumbnailRequestSchema = z.object({
  requestId: z.uuid(),
  maxCost: z.union([z.literal(0), z.literal(10)]),
  topic: z.string().trim().min(3).max(1000),
  headline: z.string().trim().max(80).default(""),
  style: z.enum(["bold", "cinematic", "minimal"]).default("bold"),
  photos: z.array(z.object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    data: z.string().min(4).max(Math.ceil(PHOTO_LIMIT / 3) * 4).regex(/^[A-Za-z0-9+/]+={0,2}$/),
  })).max(3).default([]),
});
export type ThumbnailInput = z.infer<typeof thumbnailRequestSchema>;
export type ThumbnailStatus = {
  credits: number;
  freeAvailable: boolean;
  resetsAt: string;
  configured: boolean;
  pending: string | null;
  recent: Array<{ id: string; topic: string; cost: number }>;
};

// Fixed UTC offset: India has no daylight-saving transitions.
export function thumbnailDay(now = new Date()) {
  const offset = 330 * 60_000;
  const shifted = new Date(now.getTime() + offset);
  const day = shifted.toISOString().slice(0, 10);
  return { day, resetsAt: new Date(Date.parse(`${day}T00:00:00Z`) + 86400_000 - offset).toISOString() };
}
