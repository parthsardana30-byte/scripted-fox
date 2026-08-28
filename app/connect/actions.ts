"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { disconnectYouTube } from "@/lib/youtube/repository";

export async function disconnectYouTubeAction() {
  const user = await requireAuthenticatedUser();
  await disconnectYouTube(user.id);
  revalidatePath("/dashboard");
  redirect("/connect?status=disconnected");
}
