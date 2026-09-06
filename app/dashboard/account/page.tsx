import Link from "next/link";
import { Check, KeyRound, Link2 } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { updateCreatorProfile } from "@/app/dashboard/account/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess } from "@/lib/billing/access";
import { getPlanDisplayName } from "@/lib/billing/plans";
import { createClient } from "@/lib/db/client";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: preferences }, { data: connection }, access, params] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("user_preferences").select("default_script_preferences").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("youtube_connections")
      .select("channel_title,status,last_synced_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    getBillingAccess(user.id),
    searchParams,
  ]);
  const metadataName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "Creator";
  const displayName = profile?.display_name ?? metadataName;
  const scriptPreferences = preferences?.default_script_preferences
    && typeof preferences.default_script_preferences === "object"
    && !Array.isArray(preferences.default_script_preferences)
    ? preferences.default_script_preferences
    : {};
  const channelNiche = typeof scriptPreferences.channelNiche === "string" ? scriptPreferences.channelNiche : "";
  const channelGoal = typeof scriptPreferences.channelGoal === "string" ? scriptPreferences.channelGoal : "growth";
  const providers = Array.isArray(user.app_metadata.providers) ? user.app_metadata.providers : [];
  const signInMethod = providers.includes("google") && providers.includes("email")
    ? "Google and email"
    : providers.includes("google") ? "Google" : "Email and password";
  const profileMessage = params.profile === "saved"
    ? "Profile saved."
    : params.profile === "invalid"
        ? "Check the profile fields and try again."
      : params.profile === "error"
        ? "Your name could not be saved. Try again."
        : null;

  return <div className="dashboard-page">
    <PageHeader title="Account" description="Manage your creator identity, sign-in, and connected channel." />
    <section className="settings-section">
      <div><h2>Creator profile</h2><p>These details help tailor ideas and scripts to your channel.</p></div>
      <form className="settings-fields" action={updateCreatorProfile}>
        <div className="settings-field">
          <label htmlFor="displayName">Display name</label>
          <input id="displayName" name="displayName" defaultValue={displayName} minLength={2} maxLength={80} required />
        </div>
        <div className="settings-field">
          <label htmlFor="channelNiche">Channel topic</label>
          <input id="channelNiche" name="channelNiche" defaultValue={channelNiche} maxLength={80} placeholder="For example: filmmaking, technology, finance" />
          <small>Optional. Used as context when channel history is limited.</small>
        </div>
        <div className="settings-field">
          <label htmlFor="channelGoal">Main channel goal</label>
          <select id="channelGoal" name="channelGoal" defaultValue={channelGoal}>
            <option value="growth">Grow views and subscribers</option>
            <option value="authority">Build authority</option>
            <option value="leads">Generate leads or sales</option>
            <option value="community">Strengthen the community</option>
          </select>
        </div>
        <p className={`settings-feedback${params.profile === "error" || params.profile === "invalid" ? " settings-feedback--error" : ""}`} role="status" aria-live="polite">{profileMessage}</p>
        <button className="button button--primary" type="submit">Save profile</button>
      </form>
    </section>
    <section className="settings-section">
      <div><h2>YouTube connection</h2><p>Used only for channel-aware ideas and insights.</p></div>
      <div className="connection-status">
        <span>{connection ? <Check size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />}</span>
        <div>
          <strong>{connection ? connection.channel_title ?? "YouTube connected" : "No channel connected"}</strong>
          <p>{connection
            ? `Status: ${connection.status}${connection.last_synced_at ? ` · Updated ${new Date(connection.last_synced_at).toLocaleString("en-IN")}` : ""}`
            : "Connect a channel to replace demonstration analytics with your data."}</p>
        </div>
        <Link className="button button--secondary button--small" href="/connect">{connection ? "Manage" : "Connect YouTube"}</Link>
      </div>
    </section>
    <section className="settings-section">
      <div><h2>Plan and billing</h2><p>Review your access without adding another item to the sidebar.</p></div>
      <div className="account-plan">
        <div><span>Current plan</span><strong>{getPlanDisplayName(access.plan)}</strong><p>{access.status === "trialing" ? "Trial access is active." : access.plan === "free" ? "No payment method or subscription is attached." : `Status: ${access.status}`}</p></div>
        <Link className="button button--secondary button--small" href="/dashboard/upgrade">View plans</Link>
      </div>
    </section>
    <section className="settings-section">
      <div><h2>Sign-in and security</h2><p>Review how this account is accessed.</p></div>
      <div className="account-security">
        <dl className="account-facts">
          <div><dt>Email address</dt><dd>{user.email ?? "Not available"}</dd></div>
          <div><dt>Sign-in method</dt><dd>{signInMethod}</dd></div>
          <div><dt>Member since</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(user.created_at))}</dd></div>
        </dl>
        <div className="account-actions">
          <Link className="button button--secondary button--small" href="/forgot-password"><KeyRound size={16} aria-hidden="true" /> Change password</Link>
          <form action={signOut}><button className="button button--secondary button--small" type="submit">Sign out</button></form>
        </div>
      </div>
    </section>
  </div>;
}
