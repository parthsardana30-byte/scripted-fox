"use client";

import { Check, Languages, LogOut, Radio, Save, SlidersHorizontal, UserRound } from "lucide-react";
import { useActionState } from "react";

import { saveSettings, type SettingsActionState } from "@/app/dashboard/settings/actions";
import { signOut } from "@/app/(auth)/actions";
import { NicheConfirmationDialog } from "./niche-confirmation-dialog";
import { ManageAccountDialog, type ManagedAccount } from "./manage-account-dialog";
import { PageHeader } from "./page-header";

type SettingsValues = {
  language: string;
  secondaryLanguage: string;
  market: string;
  tone: string;
  videoLength: string;
  openingStyle: string;
};

const initialState: SettingsActionState = { status: "idle" };

export function SettingsView({ initialValues, channel = null, account }: {
  initialValues: SettingsValues;
  channel?: { name: string; niche: string } | null;
  account: ManagedAccount;
}) {
  const [state, formAction, pending] = useActionState(saveSettings, initialState);

  return <div className="dashboard-page dashboard-settings">
    <PageHeader eyebrow="Workspace settings" title={<>Make it feel <span className="settings-title-accent">yours.</span></>} />
    <div className="settings-identity-grid">
      <section className="settings-section settings-account-entry">
        <div className="settings-section__intro"><span><UserRound size={19} /></span><div><h2>Account</h2><p>Profile, plan, sign-in, and channel access.</p></div></div>
        <div className="settings-account-entry__card">
          <div><strong>{account.displayName}</strong><small>{account.email}</small></div>
          <div className="settings-account-entry__actions">
            <ManageAccountDialog account={account} />
            <form action={signOut}>
              <button className="button button--secondary button--small settings-sign-out" type="submit"><LogOut size={15} aria-hidden="true" /> Sign out</button>
            </form>
          </div>
        </div>
      </section>
      {channel ? (
        <section className="settings-section settings-section--channel">
          <div className="settings-section__intro"><span><Radio size={19} /></span><div><h2>Channel personalization</h2><p>Keep recommendations focused on your niche.</p></div></div>
          <div className="settings-fields">
            <div className="settings-niche">
              <div><span>Channel niche</span><strong>{channel.niche}</strong><small>{channel.name}</small></div>
              <NicheConfirmationDialog channelName={channel.name} suggestedNiche={channel.niche} mode="settings" />
            </div>
          </div>
        </section>
      ) : null}
    </div>
    <form action={formAction}>
      <section className="settings-section">
        <div className="settings-section__intro"><span><Languages size={19} /></span><div><h2>Content defaults</h2><p>Language and audience used for new ideas.</p></div></div>
        <div className="settings-fields">
          <div className="settings-field">
            <label htmlFor="language">Primary language</label>
            <select id="language" name="language" defaultValue={initialValues.language}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </div>
          <div className="settings-field">
            <label htmlFor="secondaryLanguage">Secondary language</label>
            <select id="secondaryLanguage" name="secondaryLanguage" defaultValue={initialValues.secondaryLanguage}>
              <option value="none">None</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="hinglish">Hinglish</option>
            </select>
            <small>Used when an idea would work better in another language.</small>
          </div>
          <div className="settings-field">
            <label htmlFor="market">Primary audience</label>
            <select id="market" name="market" defaultValue={initialValues.market}>
              <option value="IN">India</option>
              <option value="GLOBAL">Worldwide</option>
            </select>
          </div>
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-section__intro"><span><SlidersHorizontal size={19} /></span><div><h2>Script defaults</h2><p>Your starting point for every new script.</p></div></div>
        <div className="settings-fields">
          <div className="settings-field">
            <label htmlFor="tone">Default tone</label>
            <select id="tone" name="tone" defaultValue={initialValues.tone}>
              <option value="clear">Clear and conversational</option>
              <option value="direct">Direct and concise</option>
              <option value="educational">Warm and educational</option>
            </select>
          </div>
          <div className="settings-field">
            <label htmlFor="videoLength">Target video length</label>
            <select id="videoLength" name="videoLength" defaultValue={initialValues.videoLength}>
              <option value="under-5">Under 5 minutes</option>
              <option value="7-10">7–10 minutes</option>
              <option value="10-15">10–15 minutes</option>
            </select>
          </div>
          <div className="settings-field">
            <label htmlFor="openingStyle">Default opening</label>
            <select id="openingStyle" name="openingStyle" defaultValue={initialValues.openingStyle}>
              <option value="value-first">State the value immediately</option>
              <option value="hook">Lead with a strong hook</option>
              <option value="story">Open with a short story</option>
            </select>
          </div>
        </div>
      </section>
      <section className="settings-section settings-section--save">
        <div className="settings-section__intro"><span><Save size={19} /></span><div><h2>Ready to apply?</h2><p>Use these defaults for future recommendations and scripts.</p></div></div>
        <div className="settings-fields">
          {state.message ? <p className={`settings-feedback${state.status === "error" ? " settings-feedback--error" : ""}`} role="status" aria-live="polite">{state.message}</p> : null}
          <button className="button button--primary" type="submit" disabled={pending}>
            {state.status === "success" && !pending && <Check size={15} aria-hidden="true" />}
            {pending ? "Saving…" : "Save all settings"}
          </button>
        </div>
      </section>
    </form>
  </div>;
}
