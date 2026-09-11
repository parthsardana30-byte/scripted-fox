import { redirect } from "next/navigation";

export default function YouTubeConnectionHelpPage() {
  redirect("/help?category=account&faq=youtube-channel-in-use");
}
