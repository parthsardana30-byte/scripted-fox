"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";

import { saveSettings, type SettingsActionState } from "@/app/dashboard/settings/actions";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { PageHeader } from "./page-header";

type SettingsValues = {
  language: string;
  secondaryLanguage: string;
  market: string;
  tone: string;
  videoLength: string;
  detailLevel: string;
  openingStyle: string;
  exportFormat: string;
  includeTitle: boolean;
  openAssistant: boolean;
};

const initialState: SettingsActionState = { status: "idle" };

export function SettingsView({ initialValues }: { initialValues: SettingsValues }) {
  const [state, formAction, pending] = useActionState(saveSettings, initialState);

  return <div className="dashboard-page">
    <PageHeader title="Settings" description="Set the defaults used for recommendations and new scripts." />
    <section className="settings-section">
      <div><h2>Appearance</h2><p>Choose how Scripted Fox looks on this device.</p></div>
      <div className="settings-fields">
        <div className="settings-appearance">
          <div><strong>Colour theme</strong><small>Switch between the light and dark workspace.</small></div>
          <ThemeToggle showLabel />
        </div>
      </div>
    </section>
    <form action={formAction}>
      <section className="settings-section">
        <div><h2>Content defaults</h2><p>Used when generating ideas and scripts.</p></div>
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
        <div><h2>Script defaults</h2><p>You can change these for any individual script.</p></div>
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
            <label htmlFor="detailLevel">Outline detail</label>
            <select id="detailLevel" name="detailLevel" defaultValue={initialValues.detailLevel}>
              <option value="lean">Lean — key beats only</option>
              <option value="balanced">Balanced — beats and talking points</option>
              <option value="detailed">Detailed — full planning notes</option>
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
      <section className="settings-section">
        <div><h2>Export and editor</h2><p>Applied when starting and exporting a new script.</p></div>
        <div className="settings-fields">
          <div className="settings-field">
            <label htmlFor="exportFormat">Default export format</label>
            <select id="exportFormat" name="exportFormat" defaultValue={initialValues.exportFormat}>
              <option value="markdown">Markdown</option>
              <option value="txt">Plain text</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word document</option>
            </select>
          </div>
          <label className="settings-check">
            <input type="checkbox" name="includeTitle" defaultChecked={initialValues.includeTitle} />
            <span><strong>Include script title</strong><small>Add the title at the top of exported files.</small></span>
          </label>
          <label className="settings-check">
            <input type="checkbox" name="openAssistant" defaultChecked={initialValues.openAssistant} />
            <span><strong>Open AI assistant with the editor</strong><small>Start new scripts with the right-side assistant ready.</small></span>
          </label>
          <p className={`settings-feedback${state.status === "error" ? " settings-feedback--error" : ""}`} role="status" aria-live="polite">{state.message}</p>
          <button className="button button--primary" type="submit" disabled={pending}>
            {state.status === "success" && !pending && <Check size={15} aria-hidden="true" />}
            {pending ? "Saving…" : "Save all settings"}
          </button>
        </div>
      </section>
    </form>
  </div>;
}
