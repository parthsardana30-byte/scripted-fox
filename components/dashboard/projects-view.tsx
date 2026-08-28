"use client";

import Link from "next/link";
import { ArrowUpDown, FileText, MoreHorizontal, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { dashboardSnapshot } from "@/lib/dashboard-mocks";
import type { ProjectStatus } from "@/types/dashboard";
import { PageHeader } from "./page-header";

export function ProjectsView() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "All">("All");
  const projects = useMemo(() => dashboardSnapshot.projects.filter((project) => (status === "All" || project.status === status) && project.title.toLowerCase().includes(query.toLowerCase())), [query, status]);

  return (
    <div className="dashboard-page">
      <PageHeader eyebrow="Script library" title="Projects" description="Find every script, check its recording status, and get back to work." actions={<Link className="button button--primary button--small" href="/dashboard/editor"><Plus size={16} aria-hidden="true" /> New script</Link>} />
      <div className="project-tools">
        <label className="dashboard-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search projects</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search scripts" /></label>
        <label className="dashboard-select"><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | "All")}><option>All</option><option>Draft</option><option>Ready to record</option><option>Published</option></select></label>
        <button className="button button--quiet button--small" type="button"><ArrowUpDown size={15} aria-hidden="true" /> Recently updated</button>
      </div>
      {projects.length ? <div className="projects-table" role="table" aria-label="Script projects">
        <div className="projects-table__header" role="row"><span role="columnheader">Project</span><span role="columnheader">Status</span><span role="columnheader">Length</span><span role="columnheader">Updated</span><span role="columnheader"><span className="sr-only">Actions</span></span></div>
        {projects.map((project) => <div className="projects-table__row" role="row" key={project.id}>
          <span className="projects-table__title" role="cell"><FileText size={18} aria-hidden="true" /><Link href={`/dashboard/editor/${project.id}`}>{project.title}</Link></span>
          <span role="cell"><span className={`status-badge status-badge--${project.status.toLowerCase().replaceAll(" ", "-")}`}>{project.status}</span></span>
          <span role="cell">{project.words} words · {project.duration}</span><span role="cell">{project.updatedAt}</span>
          <span role="cell"><button className="dashboard-icon-button" type="button" disabled title="Project actions will be connected in the backend phase" aria-label={`More actions for ${project.title} (coming soon)`}><MoreHorizontal size={18} aria-hidden="true" /></button></span>
        </div>)}
      </div> : <div className="dashboard-empty"><FileText size={24} aria-hidden="true" /><h2>No matching projects</h2><p>Try a different search or status.</p></div>}
    </div>
  );
}
