import { ProjectsView } from "@/components/dashboard/projects-view";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/projects/repository";

export default async function ProjectsPage() {
  const user = await requireAuthenticatedUser();
  return <ProjectsView initialProjects={await listProjects(user.id)} />;
}
