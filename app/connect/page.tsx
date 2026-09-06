import Link from "next/link";
import { Check, Link2, ShieldCheck, Video } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DisconnectYouTubeButton } from "@/components/youtube/disconnect-button";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/client";

const messages: Record<string, string> = {
  connected: "Your YouTube channel is connected.",
  cancelled: "You cancelled the connection. Nothing was changed.",
  disconnected: "Your YouTube connection and stored credentials were removed.",
};

const errors: Record<string, string> = {
  invalid_state: "The connection request expired or could not be verified. Start again.",
  no_channel: "That Google account does not have an accessible YouTube channel.",
  connection_failed: "YouTube could not be connected. Check the Google API setup and try again.",
  not_configured: "YouTube connection is not fully configured for this environment.",
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in?next=/connect");

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("youtube_connections")
    .select("channel_title,status,last_synced_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const query = await searchParams;
  const notice = (query.status && messages[query.status]) || (query.error && errors[query.error]);

  return (
    <main className="placeholder-page">
      <div className="placeholder-page__panel">
        <span className="demo-label">Channel connection</span>
        {connection ? <Check aria-hidden="true" size={30} /> : <Video aria-hidden="true" size={30} />}
        <h1>{connection ? connection.channel_title ?? "YouTube connected" : "Connect your YouTube channel"}</h1>
        <p>{connection
          ? "Your channel is available for personalized ideas and analytics."
          : "Grant read-only access after signing in. Connecting YouTube stays optional and does not let Scripted Fox edit or publish videos."}</p>
        {notice && <p role={query.error ? "alert" : "status"}>{notice}</p>}

        {!connection && <ul className="dialog-points">
          <li>Read your channel identity and public video statistics.</li>
          <li>Read YouTube Analytics reports for your own content.</li>
          <li>Store the refresh token encrypted on the server.</li>
        </ul>}

        <div className="placeholder-page__actions">
          {connection ? <>
            <Button asChild><Link href="/api/youtube/connect"><Link2 aria-hidden="true" size={17} />Reconnect</Link></Button>
            <DisconnectYouTubeButton />
          </> : <Button asChild><Link href="/api/youtube/connect"><Link2 aria-hidden="true" size={17} />Continue with Google</Link></Button>}
          <Button asChild variant="secondary"><Link href="/dashboard"><ShieldCheck aria-hidden="true" size={17} />Back to dashboard</Link></Button>
        </div>
      </div>
    </main>
  );
}
