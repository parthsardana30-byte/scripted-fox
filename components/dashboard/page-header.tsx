export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: React.ReactNode }) {
  return (
    <header className="dashboard-page-header">
      <div>
        {eyebrow && <p className="dashboard-context">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="dashboard-page-header__actions">{actions}</div>}
    </header>
  );
}
