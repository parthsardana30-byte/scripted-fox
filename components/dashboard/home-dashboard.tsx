import Link from "next/link";
import { ArrowRight, Check, Circle, Clock3, FileText, Lightbulb } from "lucide-react";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { dashboardSnapshot } from "@/lib/dashboard-mocks";
import { pricingHref } from "@/lib/billing/plans";

export type DashboardSetupStatus = {
  accountCreated: boolean;
  channelConnected: boolean;
  preferencesSet: boolean;
};

export function HomeDashboard({
  setup,
  canUseScriptWriter = true,
  userName = "Creator",
}: {
  setup: DashboardSetupStatus;
  canUseScriptWriter?: boolean;
  userName?: string;
}) {
  const [currentProject] = dashboardSnapshot.projects;
  const [recommendedIdea] = dashboardSnapshot.recommendations;
  const setupItems = [
    {
      complete: setup.accountCreated,
      title: "Account created",
      completeText: "Your workspace is ready.",
      incompleteText: "Create an account to save your workspace.",
      href: null,
      action: null,
    },
    {
      complete: setup.channelConnected,
      title: "Channel connected",
      completeText: "Your YouTube channel is connected.",
      incompleteText: "Connect YouTube for personalized ideas and analytics.",
      href: "/connect",
      action: "Connect channel",
    },
    {
      complete: setup.preferencesSet,
      title: "Set your script preferences",
      completeText: "Your writing and export defaults are saved.",
      incompleteText: "Choose tone, length, structure, and export defaults.",
      href: "/dashboard/settings",
      action: "Set preferences",
    },
  ];
  const completedSetupItems = setupItems.filter((item) => item.complete).length;
  const setupComplete = completedSetupItems === setupItems.length;

  return (
    <div className="dashboard-page dashboard-home">
      <header className="dashboard-home__intro">
        <DashboardGreeting userName={userName} />
        <p>Pick up the script that needs your attention.</p>
      </header>

      <section className="dashboard-focus" aria-labelledby="continue-title">
        <div className="dashboard-section-heading">
          <div><p className="dashboard-context">Continue working</p><h2 id="continue-title">{currentProject.title}</h2></div>
          <span className="status-badge status-badge--draft">{currentProject.status}</span>
        </div>
        <p className="dashboard-focus__summary">Your opening and first comparison are drafted. Next: finish the final two tools and write the verdict.</p>
        <div className="dashboard-focus__meta"><span>{currentProject.words} words</span><span>{currentProject.duration} read</span><span>Edited {currentProject.updatedAt}</span></div>
        <Link className="dashboard-text-link" href={`/dashboard/editor/${currentProject.id}`}>Open script <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>

      <div className={`dashboard-home__grid${setupComplete ? " dashboard-home__grid--single" : ""}`}>
        <section className="dashboard-panel dashboard-recommendation" aria-labelledby="recommendation-title">
          <div className="dashboard-section-heading"><div><p className="dashboard-context">Recommended for your channel</p><h2 id="recommendation-title">{recommendedIdea.title}</h2></div><Lightbulb size={20} aria-hidden="true" /></div>
          <p>{recommendedIdea.reason}</p>
          <dl className="dashboard-inline-evidence">
            {recommendedIdea.evidence.slice(0, 2).map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
          </dl>
          <div className="dashboard-panel__actions"><Link className="button button--primary button--small" href={canUseScriptWriter ? `/dashboard/editor?idea=${recommendedIdea.id}` : pricingHref("ai_script_writer", "/dashboard")}>Generate script</Link><Link className="button button--quiet button--small" href="/dashboard/ideas">See all ideas</Link></div>
        </section>

        {!setupComplete ? (
          <section className="dashboard-panel" aria-labelledby="setup-title">
            <div className="dashboard-section-heading"><div><h2 id="setup-title">Finish setup</h2><p className="dashboard-section-note">Get more useful recommendations.</p></div><span className="dashboard-progress">{completedSetupItems} of {setupItems.length}</span></div>
            <ul className="dashboard-checklist">
              {setupItems.map((item) => <li className={item.complete ? undefined : "dashboard-checklist__open"} key={item.title}>{item.complete ? <Check size={17} aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />}<span><strong>{item.title}</strong><small>{item.complete ? item.completeText : item.incompleteText}</small></span>{!item.complete && item.href && item.action && <Link href={item.href}>{item.action}</Link>}</li>)}
            </ul>
          </section>
        ) : null}
      </div>

      <section className="dashboard-recent" aria-labelledby="recent-title">
        <div className="dashboard-section-heading"><h2 id="recent-title">Recent projects</h2><Link className="dashboard-text-link" href="/dashboard/projects">View all <ArrowRight size={15} aria-hidden="true" /></Link></div>
        <div className="dashboard-project-rows">
          {dashboardSnapshot.projects.map((project) => (
            <Link className="dashboard-project-row" href={`/dashboard/editor/${project.id}`} key={project.id}>
              <FileText size={18} aria-hidden="true" />
              <span className="dashboard-project-row__title">{project.title}</span>
              <span className={`status-badge status-badge--${project.status.toLowerCase().replaceAll(" ", "-")}`}>{project.status}</span>
              <span className="dashboard-project-row__time"><Clock3 size={14} aria-hidden="true" />{project.updatedAt}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
